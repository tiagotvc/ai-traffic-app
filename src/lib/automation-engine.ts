import "server-only";

import { Between, In } from "typeorm";

import { repositories } from "@/db/repositories";
import type { MetaCampaign } from "@/lib/meta-graph";
import { pauseCampaign } from "@/lib/meta-graph";
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
    const action = rule.action as { type?: string };
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
      for (const s of snaps) {
        spend += num(s.spend);
        conversions += num(s.conversions);
        const leads = num(s.leads);
        if (leads > 0) {
          cplSum += num(s.spend) / leads;
          cplN += 1;
        }
      }
      const cpl = cplN ? cplSum / cplN : 0;

      let metricVal = 0;
      if (cond.metric === "cpl") metricVal = cpl;
      else if (cond.metric === "spend") metricVal = spend;
      else if (cond.metric === "conversions") metricVal = conversions;

      if (cond.minSpend && spend < cond.minSpend) continue;

      const threshold = cond.value ?? 0;
      const hit =
        cond.op === "gt"
          ? metricVal > threshold
          : cond.op === "lt"
            ? metricVal < threshold
            : metricVal >= threshold;

      if (!hit) continue;

      if (action.type === "pause_campaign" && metaAccessToken) {
        try {
          await pauseCampaign(metaAccessToken, metaCampaignId);
          const meta = campaignMeta.get(metaCampaignId);
          await alertRepo.save(
            alertRepo.create({
              tenantId,
              clientId: rule.clientId ?? accounts[0]?.clientId ?? null,
              type: "OTHER",
              severity: "critical",
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
      }
    }
  }
}
