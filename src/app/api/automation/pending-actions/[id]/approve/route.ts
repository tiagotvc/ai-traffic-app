import { NextResponse } from "next/server";
import { Like } from "typeorm";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";
import { activateCampaign, fetchCampaign, pauseCampaign, updateCampaignDailyBudget } from "@/lib/meta-graph";

const SCHEDULE_PAUSED = "schedule:paused";
const SCHEDULE_ACTIVATED = "schedule:activated";

/** Aprova uma pendência: executa a ação real na Meta agora e fecha o registro. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { tenant, user, metaAccessToken } = await getAppContext();
  if (!metaAccessToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const { automationPendingAction: pendingRepo, automationRule: ruleRepo, alert: alertRepo } =
    await repositories();

  const pending = await pendingRepo.findOne({ where: { id, tenantId: tenant.id } });
  if (!pending) {
    return NextResponse.json({ ok: false, error: "Pendência não encontrada" }, { status: 404 });
  }
  if (pending.status !== "pending") {
    return NextResponse.json({ ok: false, error: "Pendência já foi resolvida" }, { status: 409 });
  }

  const rule = await ruleRepo.findOne({ where: { id: pending.automationRuleId, tenantId: tenant.id } });
  const isScheduleRule = !!(rule?.condition as { schedule?: unknown } | undefined)?.schedule;
  const today = new Date().toISOString().slice(0, 10);

  try {
    if (pending.actionType === "pause_campaign") {
      await pauseCampaign(metaAccessToken, pending.metaCampaignId);
    } else if (pending.actionType === "reactivate_campaign") {
      await activateCampaign(metaAccessToken, pending.metaCampaignId);
    } else if (pending.actionType === "adjust_budget_percent" || pending.actionType === "scale_gradual_step") {
      const pct = Number(pending.budgetPercent) || 10;
      const campaign = await fetchCampaign(metaAccessToken, pending.metaCampaignId);
      const currentMinor = Number(campaign.daily_budget ?? 0);
      if (currentMinor) {
        const next = Math.round(currentMinor * (1 + pct / 100));
        await updateCampaignDailyBudget(metaAccessToken, pending.metaCampaignId, next);
      }
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Falha ao executar na Meta" }, { status: 502 });
  }

  pending.status = "approved";
  pending.approvedBy = user.id;
  pending.approvedAt = new Date();
  await pendingRepo.save(pending);

  // Passo do escalonamento gradual: mesma lógica de state tracking do motor — o próximo passo
  // é sempre `último passo registrado nos Alerts + 1` (a pendência nunca avança o contador
  // sozinha, só a aprovação/execução real fazem isso).
  let scaleStepMetricKey: string | undefined;
  if (pending.actionType === "scale_gradual_step") {
    const lastStepAlert = await alertRepo.findOne({
      where: {
        tenantId: tenant.id,
        automationRuleId: pending.automationRuleId,
        metaCampaignId: pending.metaCampaignId,
        metricKey: Like("scale:step:%")
      },
      order: { createdAt: "DESC" }
    });
    const lastStep = lastStepAlert ? Number(lastStepAlert.metricKey?.split(":")[2]) || 0 : 0;
    scaleStepMetricKey = `scale:step:${lastStep + 1}`;
  }

  try {
    await alertRepo.save(
      alertRepo.create({
        tenantId: tenant.id,
        clientId: pending.clientId,
        type: "OTHER",
        severity: pending.actionType === "pause_campaign" ? "critical" : "warning",
        source: "automation",
        automationRuleId: pending.automationRuleId,
        title: `Automação: pendência aprovada (${rule?.name ?? "regra removida"})`,
        description: pending.description,
        metaCampaignId: pending.metaCampaignId,
        metricKey:
          scaleStepMetricKey ??
          (isScheduleRule
            ? pending.actionType === "pause_campaign"
              ? SCHEDULE_PAUSED
              : pending.actionType === "reactivate_campaign"
                ? SCHEDULE_ACTIVATED
                : undefined
            : undefined),
        dismissed: false,
        dedupDay: today
      })
    );
  } catch {
    // best-effort — a aprovação já foi persistida acima
  }

  return NextResponse.json({ ok: true, action: pending });
}
