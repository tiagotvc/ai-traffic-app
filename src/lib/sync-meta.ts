import "server-only";

import type { MetaCampaign } from "@/lib/meta-graph";
import {
  fetchAccountInsightsDaily,
  fetchCampaignInsightsDaily,
  fetchCampaigns,
  pickConversions,
  pickLeads
} from "@/lib/meta-graph";
import { repositories } from "@/db/repositories";
import { runAlertEngine } from "@/lib/alert-engine";
import { runAutomationEngine } from "@/lib/automation-engine";
import { ensureMetaAccountsInDb, getLinkedAdAccountsForTenant } from "@/lib/tenant-accounts";

export async function runMetaSyncForAccount(input: {
  tenantId: string;
  adAccountId: string;
  metaAdAccountId: string;
  metaAccessToken: string;
}) {
  const { metricSnapshot: metricsRepo, campaignMetricSnapshot: campRepo } = await repositories();

  const rows = await fetchAccountInsightsDaily(input.metaAccessToken, input.metaAdAccountId);
  for (const r of rows) {
    const day = r.date_start;
    if (!day) continue;

    const spend = r.spend ?? "0";
    const impressions = r.impressions ?? "0";
    const clicks = r.clicks ?? "0";
    const ctr = r.ctr ?? "0";
    const cpc = r.cpc ?? "0";
    const conversions = String(pickConversions(r.actions));
    const roas = r.purchase_roas?.[0]?.value ?? "0";

    const existing = await metricsRepo.findOne({
      where: { adAccountId: input.adAccountId, day }
    });
    if (existing) {
      existing.spend = spend;
      existing.impressions = impressions;
      existing.clicks = clicks;
      existing.ctr = ctr;
      existing.cpc = cpc;
      existing.conversions = conversions;
      existing.roas = roas;
      await metricsRepo.save(existing);
    } else {
      await metricsRepo.save(
        metricsRepo.create({
          adAccountId: input.adAccountId,
          day,
          spend,
          impressions,
          clicks,
          ctr,
          cpc,
          conversions,
          roas
        })
      );
    }
  }

  let campaigns: MetaCampaign[] = [];
  try {
    campaigns = await fetchCampaigns(input.metaAccessToken, input.metaAdAccountId);
  } catch {
    campaigns = [];
  }

  const budgetByCampaign = new Map(
    campaigns.map((c) => [c.id, c.daily_budget ? String(Number(c.daily_budget) / 100) : null])
  );

  const campRows = await fetchCampaignInsightsDaily(input.metaAccessToken, input.metaAdAccountId);

  for (const r of campRows) {
    const day = r.date_start;
    const metaCampaignId = r.campaign_id;
    if (!day || !metaCampaignId) continue;

    const spend = r.spend ?? "0";
    const impressions = r.impressions ?? "0";
    const clicks = r.clicks ?? "0";
    const ctr = r.ctr ?? "0";
    const cpc = r.cpc ?? "0";
    const conversions = String(pickConversions(r.actions));
    const leads = String(pickLeads(r.actions));
    const roas = r.purchase_roas?.[0]?.value ?? "0";

    const existing = await campRepo.findOne({
      where: { adAccountId: input.adAccountId, metaCampaignId, day }
    });
    const dailyBudget = budgetByCampaign.get(metaCampaignId) ?? null;

    if (existing) {
      existing.campaignName = r.campaign_name ?? existing.campaignName;
      existing.spend = spend;
      existing.impressions = impressions;
      existing.clicks = clicks;
      existing.ctr = ctr;
      existing.cpc = cpc;
      existing.conversions = conversions;
      existing.leads = leads;
      existing.roas = roas;
      existing.dailyBudget = dailyBudget;
      await campRepo.save(existing);
    } else {
      await campRepo.save(
        campRepo.create({
          adAccountId: input.adAccountId,
          metaCampaignId,
          campaignName: r.campaign_name ?? null,
          day,
          spend,
          impressions,
          clicks,
          ctr,
          cpc,
          conversions,
          leads,
          roas,
          dailyBudget
        })
      );
    }
  }

  return { campaigns };
}

export async function runMetaSync(input: {
  tenantId: string;
  defaultClientId: string;
  metaAccessToken: string;
}) {
  await ensureMetaAccountsInDb(input.tenantId, input.defaultClientId, input.metaAccessToken);
  const { accounts } = await getLinkedAdAccountsForTenant(input.tenantId);

  const campaignMeta = new Map<string, MetaCampaign>();

  for (const account of accounts) {
    try {
      const { campaigns } = await runMetaSyncForAccount({
        tenantId: input.tenantId,
        adAccountId: account.id,
        metaAdAccountId: account.metaAdAccountId,
        metaAccessToken: input.metaAccessToken
      });
      for (const c of campaigns) campaignMeta.set(c.id, c);
    } catch {
      // continue other accounts
    }
  }

  await runAlertEngine(input.tenantId, campaignMeta);
  await runAutomationEngine(input.tenantId, input.metaAccessToken, campaignMeta);
  return { accountsSynced: accounts.length };
}
