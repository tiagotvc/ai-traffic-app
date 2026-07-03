import { NextResponse } from "next/server";
import { Like } from "typeorm";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";
import { approveExecution } from "@/lib/engine/executor";

const SCHEDULE_PAUSED = "schedule:paused";
const SCHEDULE_ACTIVATED = "schedule:activated";

/**
 * Aprova uma pendência: o executor unificado do Engine executa a ação real na Meta e
 * fecha a `engine_execution` como `executed`. Esta rota mantém a escrita do `Alert`
 * (projeção de UI + state-tracking do motor: passos de escalada e chaves de agenda).
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { tenant, user, metaAccessToken } = await getAppContext();
  if (!metaAccessToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const outcome = await approveExecution({
    tenantId: tenant.id,
    executionId: id,
    userId: user.id,
    metaAccessToken
  });
  if (!outcome.ok) {
    const status =
      outcome.code === "not_found" ? 404 : outcome.code === "already_resolved" ? 409 : 502;
    return NextResponse.json({ ok: false, error: outcome.error }, { status });
  }

  const execution = outcome.execution;
  const { automationRule: ruleRepo, alert: alertRepo } = await repositories();
  const rule = execution.automationRuleId
    ? await ruleRepo.findOne({ where: { id: execution.automationRuleId, tenantId: tenant.id } })
    : null;
  const isScheduleRule = !!(rule?.condition as { schedule?: unknown } | undefined)?.schedule;
  const today = new Date().toISOString().slice(0, 10);

  // Passo do escalonamento gradual: mesma lógica de state tracking do motor — o próximo passo
  // é sempre `último passo registrado nos Alerts + 1` (a pendência nunca avança o contador
  // sozinha, só a aprovação/execução real fazem isso).
  let scaleStepMetricKey: string | undefined;
  if (execution.actionType === "scale_gradual_step" && execution.metaCampaignId) {
    const lastStepAlert = await alertRepo.findOne({
      where: {
        tenantId: tenant.id,
        automationRuleId: execution.automationRuleId ?? undefined,
        metaCampaignId: execution.metaCampaignId,
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
        clientId: execution.clientId,
        type: "OTHER",
        severity: execution.actionType === "pause_campaign" ? "critical" : "warning",
        source: "automation",
        automationRuleId: execution.automationRuleId,
        title: `Automação: pendência aprovada (${rule?.name ?? "regra removida"})`,
        description: execution.description,
        metaCampaignId: execution.metaCampaignId,
        metricKey:
          scaleStepMetricKey ??
          (isScheduleRule
            ? execution.actionType === "pause_campaign"
              ? SCHEDULE_PAUSED
              : execution.actionType === "reactivate_campaign"
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

  return NextResponse.json({ ok: true, action: execution });
}
