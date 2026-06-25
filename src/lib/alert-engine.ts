import "server-only";

import { Between, In } from "typeorm";

import type { Alert, AlertSeverity, AlertType } from "@/db/entities/Alert";
import type { CampaignMetricSnapshot } from "@/db/entities/CampaignMetricSnapshot";
import type { ClientGoal } from "@/db/entities/ClientGoal";
import type { CampaignGoal } from "@/db/entities/CampaignGoal";
import { repositories } from "@/db/repositories";
import { entityToGoalFields, mergeGoals, num } from "@/lib/goal-types";
import { listClientsForTenant } from "@/lib/app-context";
import type { MetaCampaign } from "@/lib/meta-graph";

type AlertDraft = {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  metricKey?: string;
  actualValue?: number;
  thresholdValue?: number;
  metaCampaignId?: string;
  adAccountId?: string;
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function windowStart(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - Math.max(0, days - 1));
  return d.toISOString().slice(0, 10);
}

type Agg = {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  leads: number;
  roasSum: number;
  roasCount: number;
  ctrSum: number;
  cpcSum: number;
  cpcCount: number;
};

function aggregateCampaignRows(rows: CampaignMetricSnapshot[]): Agg {
  const agg: Agg = {
    spend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    leads: 0,
    roasSum: 0,
    roasCount: 0,
    ctrSum: 0,
    cpcSum: 0,
    cpcCount: 0
  };
  for (const r of rows) {
    agg.spend += num(r.spend);
    agg.impressions += num(r.impressions);
    agg.clicks += num(r.clicks);
    agg.conversions += num(r.conversions);
    agg.leads += num(r.leads);
    const roas = num(r.roas);
    if (roas > 0) {
      agg.roasSum += roas;
      agg.roasCount += 1;
    }
    agg.ctrSum += num(r.ctr);
    const cpc = num(r.cpc);
    if (cpc > 0) {
      agg.cpcSum += cpc;
      agg.cpcCount += 1;
    }
  }
  return agg;
}

function evaluateGoals(
  goals: ReturnType<typeof mergeGoals>,
  agg: Agg,
  ctx: { clientName: string; campaignName?: string; dailyBudget?: number }
): AlertDraft[] {
  if (!goals.enabled) return [];
  const out: AlertDraft[] = [];
  const label = ctx.campaignName ? `${ctx.clientName} — ${ctx.campaignName}` : ctx.clientName;

  const cpl = agg.leads > 0 ? agg.spend / agg.leads : 0;
  const cpa = agg.conversions > 0 ? agg.spend / agg.conversions : 0;
  const cpc = agg.cpcCount > 0 ? agg.cpcSum / agg.cpcCount : agg.clicks > 0 ? agg.spend / agg.clicks : 0;
  const ctr = agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : agg.ctrSum;
  const roas = agg.roasCount > 0 ? agg.roasSum / agg.roasCount : 0;

  if (goals.maxCpl != null && goals.maxCpl > 0 && agg.leads > 0 && cpl > goals.maxCpl) {
    out.push({
      type: "CPL_ABOVE_MAX",
      severity: "critical",
      title: label,
      description: `CPL R$ ${cpl.toFixed(2)} acima da meta de R$ ${goals.maxCpl.toFixed(2)}`,
      metricKey: "cpl",
      actualValue: cpl,
      thresholdValue: goals.maxCpl
    });
  }

  if (goals.maxCpa != null && goals.maxCpa > 0 && agg.conversions > 0 && cpa > goals.maxCpa) {
    out.push({
      type: "CPA_ABOVE_MAX",
      severity: "critical",
      title: label,
      description: `CPA R$ ${cpa.toFixed(2)} acima da meta de R$ ${goals.maxCpa.toFixed(2)}`,
      metricKey: "cpa",
      actualValue: cpa,
      thresholdValue: goals.maxCpa
    });
  }

  if (goals.maxCpc != null && goals.maxCpc > 0 && cpc > goals.maxCpc) {
    out.push({
      type: "CPC_ABOVE_MAX",
      severity: "warning",
      title: label,
      description: `CPC R$ ${cpc.toFixed(2)} acima da meta de R$ ${goals.maxCpc.toFixed(2)}`,
      metricKey: "cpc",
      actualValue: cpc,
      thresholdValue: goals.maxCpc
    });
  }

  if (goals.minCtr != null && goals.minCtr > 0 && agg.impressions > 0 && ctr < goals.minCtr) {
    out.push({
      type: "CTR_BELOW_MIN",
      severity: "warning",
      title: label,
      description: `CTR ${ctr.toFixed(2)}% abaixo do mínimo ${goals.minCtr.toFixed(2)}%`,
      metricKey: "ctr",
      actualValue: ctr,
      thresholdValue: goals.minCtr
    });
  }

  if (
    goals.minRoas != null &&
    goals.minRoas > 0 &&
    goals.objective !== "leads" &&
    agg.roasCount > 0 &&
    roas < goals.minRoas
  ) {
    out.push({
      type: "ROAS_BELOW_MIN",
      severity: "critical",
      title: label,
      description: `ROAS ${roas.toFixed(2)}x abaixo do mínimo ${goals.minRoas.toFixed(2)}x`,
      metricKey: "roas",
      actualValue: roas,
      thresholdValue: goals.minRoas
    });
  }

  if (
    goals.maxSpendWithoutConversion != null &&
    goals.maxSpendWithoutConversion > 0 &&
    agg.conversions === 0 &&
    agg.spend >= goals.maxSpendWithoutConversion
  ) {
    out.push({
      type: "SPEND_NO_CONVERSION",
      severity: "critical",
      title: label,
      description: `Gasto R$ ${agg.spend.toFixed(2)} sem conversões (limite R$ ${goals.maxSpendWithoutConversion.toFixed(2)})`,
      metricKey: "spend_no_conversion",
      actualValue: agg.spend,
      thresholdValue: goals.maxSpendWithoutConversion
    });
  }

  if (
    goals.budgetAlertPercent != null &&
    goals.budgetAlertPercent > 0 &&
    ctx.dailyBudget != null &&
    ctx.dailyBudget > 0
  ) {
    const threshold = (ctx.dailyBudget * goals.budgetAlertPercent) / 100;
    if (agg.spend >= threshold) {
      out.push({
        type: "BUDGET_NEAR_LIMIT",
        severity: "warning",
        title: label,
        description: `Gasto R$ ${agg.spend.toFixed(2)} atingiu ${goals.budgetAlertPercent}% do orçamento diário (R$ ${ctx.dailyBudget.toFixed(2)})`,
        metricKey: "budget",
        actualValue: agg.spend,
        thresholdValue: threshold
      });
    }
  }

  return out;
}

async function upsertAlert(
  alertRepo: { findOne: (q: object) => Promise<Alert | null>; save: (e: Alert) => Promise<Alert>; create: (p: Partial<Alert>) => Alert },
  tenantId: string,
  clientId: string,
  draft: AlertDraft,
  dedupDay: string
) {
  const existing = await alertRepo.findOne({
    where: {
      tenantId,
      type: draft.type,
      clientId,
      metaCampaignId: draft.metaCampaignId ?? null,
      dedupDay
    }
  });

  const payload = alertRepo.create({
    tenantId,
    clientId,
    adAccountId: draft.adAccountId ?? null,
    metaCampaignId: draft.metaCampaignId ?? null,
    type: draft.type,
    severity: draft.severity,
    title: draft.title,
    description: draft.description,
    metricKey: draft.metricKey ?? null,
    actualValue: draft.actualValue != null ? String(draft.actualValue) : null,
    thresholdValue: draft.thresholdValue != null ? String(draft.thresholdValue) : null,
    dedupDay,
    dismissed: false
  });

  if (existing) {
    existing.description = payload.description;
    existing.actualValue = payload.actualValue;
    existing.thresholdValue = payload.thresholdValue;
    existing.severity = payload.severity;
    existing.dismissed = false;
    await alertRepo.save(existing);
  } else {
    const saved = await alertRepo.save(payload);
    if (saved.severity === "critical") {
      const { client: clientRepo, tenant: tenantRepo } = await repositories();
      const [client, tenant] = await Promise.all([
        clientRepo.findOne({ where: { id: clientId } }),
        tenantRepo.findOne({ where: { id: tenantId } })
      ]);
      const { notifyCriticalAlert } = await import("@/lib/alert-notify");
      await notifyCriticalAlert({
        alert: saved,
        client,
        tenantName: tenant?.brandName ?? tenant?.name ?? "Orion Agency",
        webhookAlertUrl: tenant?.webhookAlertUrl
      });
    }
  }
}

export async function runAlertEngine(tenantId: string, campaignMeta?: Map<string, MetaCampaign>) {
  const {
    alert: alertRepo,
    clientGoal: clientGoalRepo,
    campaignGoal: campaignGoalRepo,
    campaignMetricSnapshot: campMetricsRepo,
    adAccount: adAccountRepo
  } = await repositories();

  const clients = await listClientsForTenant(tenantId);
  const dedupDay = todayStr();

  for (const client of clients) {
    const clientGoalRow = await clientGoalRepo.findOne({ where: { clientId: client.id } });
    const clientGoals = clientGoalRow
      ? entityToGoalFields(clientGoalRow)
      : { enabled: false, windowDays: 1 };

    const accounts = await adAccountRepo.find({ where: { clientId: client.id } });
    if (!accounts.length || !clientGoalRow?.enabled) continue;

    const accountIds = accounts.map((a) => a.id);
    const windowDays = clientGoals.windowDays ?? 1;
    const start = windowStart(windowDays);
    const end = dedupDay;

    const allCampRows = await campMetricsRepo.find({
      where: { adAccountId: In(accountIds), day: Between(start, end) }
    });

    const byCampaign = new Map<string, CampaignMetricSnapshot[]>();
    for (const row of allCampRows) {
      const key = row.metaCampaignId;
      const list = byCampaign.get(key) ?? [];
      list.push(row);
      byCampaign.set(key, list);
    }

    for (const [metaCampaignId, rows] of byCampaign) {
      const adAccountId = rows[0]?.adAccountId;
      const campaignName = rows[0]?.campaignName ?? metaCampaignId;
      const campGoalRow = await campaignGoalRepo.findOne({
        where: { clientId: client.id, metaCampaignId }
      });
      const goals = mergeGoals(
        { ...clientGoals, objective: clientGoalRow.objective as ClientGoal["objective"] },
        campGoalRow ? entityToGoalFields(campGoalRow) : null
      );
      if (!goals.enabled) continue;

      const agg = aggregateCampaignRows(rows);
      const metaCamp = campaignMeta?.get(metaCampaignId);
      const dailyBudget = metaCamp?.daily_budget
        ? Number(metaCamp.daily_budget) / 100
        : num(rows[rows.length - 1]?.dailyBudget);

      const drafts = evaluateGoals(goals, agg, {
        clientName: client.name,
        campaignName,
        dailyBudget: dailyBudget > 0 ? dailyBudget : undefined
      });

      for (const d of drafts) {
        await upsertAlert(alertRepo, tenantId, client.id, {
          ...d,
          metaCampaignId,
          adAccountId
        }, dedupDay);
      }
    }

    if (clientGoalRow.enabled && allCampRows.length) {
      const agg = aggregateCampaignRows(allCampRows);
      const goals = mergeGoals(
        { ...clientGoals, objective: clientGoalRow.objective },
        null
      );
      const drafts = evaluateGoals(goals, agg, { clientName: client.name });
      for (const d of drafts) {
        if (d.type === "CPL_ABOVE_MAX" || d.type === "CPA_ABOVE_MAX" || d.type === "SPEND_NO_CONVERSION") {
          await upsertAlert(alertRepo, tenantId, client.id, d, dedupDay);
        }
      }
    }
  }
}
