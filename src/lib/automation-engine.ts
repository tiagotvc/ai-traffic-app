import "server-only";

import { Between, In } from "typeorm";

import { repositories } from "@/db/repositories";
import type { MetaCampaign } from "@/lib/meta-graph";
import { pauseCampaign, updateCampaignDailyBudget, fetchCampaign } from "@/lib/meta-graph";
import { num } from "@/lib/goal-types";

function dateNDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function runAutomationEngine(
  tenantId: string,
  metaAccessToken: string | undefined,
  campaignMeta: Map<string, MetaCampaign>
) {
  const {
    automationRule: ruleRepo,
    clientMetaSettings: settingsRepo,
    campaignMetricSnapshot: campRepo,
    adAccount: adRepo,
    alert: alertRepo
  } = await repositories();

  const rules = await ruleRepo.find({ where: { tenantId, enabled: true } });
  if (!rules.length) return;

  const since = dateNDaysAgo(7);
  const today = new Date().toISOString().slice(0, 10);

  for (const rule of rules) {
    const cond = rule.condition as {
      metric?: string;
      op?: string;
      value?: number;
      minSpend?: number;
    };
    const action = rule.action as { type?: string; budgetPercent?: number };
    if (!cond.metric || !action.type) continue;

    const accounts = rule.clientId
      ? await adRepo.find({ where: { clientId: rule.clientId } })
      : await adRepo.find();

    const accountIds = accounts.map((a) => a.id);
    if (!accountIds.length) continue;

    if (rule.clientId) {
      const settings = await settingsRepo.findOne({ where: { clientId: rule.clientId } });
      if (!settings?.automationEnabled) continue;
    }

    const rows = await campRepo.find({
      where: { adAccountId: In(accountIds), day: Between(since, today) }
    });

    const byCampaign = new Map<string, typeof rows>();
    for (const r of rows) {
      const list = byCampaign.get(r.metaCampaignId) ?? [];
      list.push(r);
      byCampaign.set(r.metaCampaignId, list);
    }

    for (const [metaCampaignId, snaps] of byCampaign) {
      let spend = 0;
      let conversions = 0;
      let cplSum = 0;
      let cplN = 0;
      let roasSum = 0;
      let roasN = 0;
      let impressions = 0;
      let clicks = 0;
      for (const s of snaps) {
        spend += num(s.spend);
        conversions += num(s.conversions);
        impressions += num(s.impressions);
        clicks += num(s.clicks);
        const leads = num(s.leads);
        if (leads > 0) {
          cplSum += num(s.spend) / leads;
          cplN += 1;
        }
        const roas = num(s.roas);
        if (roas > 0) {
          roasSum += roas;
          roasN += 1;
        }
      }
      const cpl = cplN ? cplSum / cplN : 0;
      const roas = roasN ? roasSum / roasN : 0;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const cpa = conversions > 0 ? spend / conversions : 0;

      let metricVal = 0;
      if (cond.metric === "cpl") metricVal = cpl;
      else if (cond.metric === "cpa") metricVal = cpa;
      else if (cond.metric === "ctr") metricVal = ctr;
      else if (cond.metric === "spend") metricVal = spend;
      else if (cond.metric === "conversions") metricVal = conversions;
      else if (cond.metric === "roas") metricVal = roas;

      if (cond.minSpend && spend < cond.minSpend) continue;

      const threshold = cond.value ?? 0;
      const hit =
        cond.op === "gt"
          ? metricVal > threshold
          : cond.op === "lt"
            ? metricVal < threshold
            : metricVal >= threshold;

      if (!hit) continue;

      const meta = campaignMeta.get(metaCampaignId);
      const clientId = rule.clientId ?? accounts[0]?.clientId ?? null;

      if (action.type === "alert_only") {
        await alertRepo.save(
          alertRepo.create({
            tenantId,
            clientId,
            type: "OTHER",
            severity: "warning",
            source: "automation",
            automationRuleId: rule.id,
            title: `Automação: ${rule.name}`,
            description: `${meta?.name ?? metaCampaignId} — ${cond.metric}=${metricVal.toFixed(2)} (limite ${threshold})`,
            metaCampaignId,
            dismissed: false,
            dedupDay: today
          })
        );
        continue;
      }

      if (action.type === "pause_campaign" && metaAccessToken) {
        try {
          await pauseCampaign(metaAccessToken, metaCampaignId);
          await alertRepo.save(
            alertRepo.create({
              tenantId,
              clientId,
              type: "OTHER",
              severity: "critical",
              source: "automation",
              automationRuleId: rule.id,
              title: `Automação: campanha pausada (${rule.name})`,
              description: `${meta?.name ?? metaCampaignId} — ${cond.metric}=${metricVal.toFixed(2)}`,
              metaCampaignId,
              dismissed: false,
              dedupDay: today
            })
          );
        } catch {
          // skip
        }
        continue;
      }

      if (action.type === "adjust_budget_percent" && metaAccessToken) {
        const pct = action.budgetPercent ?? 10;
        try {
          const campaign = await fetchCampaign(metaAccessToken, metaCampaignId);
          const currentMinor = Number(campaign.daily_budget ?? 0);
          if (!currentMinor) continue;
          const next = Math.round(currentMinor * (1 + pct / 100));
          await updateCampaignDailyBudget(metaAccessToken, metaCampaignId, next);
          await alertRepo.save(
            alertRepo.create({
              tenantId,
              clientId,
              type: "OTHER",
              severity: "warning",
              source: "automation",
              automationRuleId: rule.id,
              title: `Automação: orçamento ajustado (${rule.name})`,
              description: `${meta?.name ?? metaCampaignId} — +${pct}% (R$ ${(currentMinor / 100).toFixed(2)} → R$ ${(next / 100).toFixed(2)}/dia)`,
              metaCampaignId,
              dismissed: false,
              dedupDay: today
            })
          );
        } catch {
          // skip
        }
      }
    }
  }
}
