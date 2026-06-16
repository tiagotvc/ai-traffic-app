import "server-only";

import type { MetaCampaign } from "@/lib/meta-graph";
import {
  fetchAccountInsightsDaily,
  fetchCampaignInsightsDaily,
  fetchCampaigns,
  pickLeads,
  pickMessages,
  pickResults
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

  // last_30d (histórico, exclui hoje) + today (dia corrente no fuso da conta).
  const [historyRows, todayRows] = await Promise.all([
    fetchAccountInsightsDaily(input.metaAccessToken, input.metaAdAccountId),
    fetchAccountInsightsDaily(input.metaAccessToken, input.metaAdAccountId, "today").catch(() => [])
  ]);
  const rows = [...historyRows, ...todayRows];
  for (const r of rows) {
    const day = r.date_start;
    if (!day) continue;

    const spend = r.spend ?? "0";
    const impressions = r.impressions ?? "0";
    const clicks = r.clicks ?? "0";
    const ctr = r.ctr ?? "0";
    const cpc = r.cpc ?? "0";
    const conversions = String(pickResults(r));
    const reach = r.reach ?? "0";
    const messages = String(pickMessages(r.actions));
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
      existing.reach = reach;
      existing.messages = messages;
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
          reach,
          messages,
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
  const statusByCampaign = new Map(campaigns.map((c) => [c.id, c.status ?? null]));

  const [campHistory, campToday] = await Promise.all([
    fetchCampaignInsightsDaily(input.metaAccessToken, input.metaAdAccountId),
    fetchCampaignInsightsDaily(input.metaAccessToken, input.metaAdAccountId, "today").catch(() => [])
  ]);
  const campRows = [...campHistory, ...campToday];

  for (const r of campRows) {
    const day = r.date_start;
    const metaCampaignId = r.campaign_id;
    if (!day || !metaCampaignId) continue;

    const spend = r.spend ?? "0";
    const impressions = r.impressions ?? "0";
    const clicks = r.clicks ?? "0";
    const ctr = r.ctr ?? "0";
    const cpc = r.cpc ?? "0";
    const conversions = String(pickResults(r));
    const leads = String(pickLeads(r.actions));
    const reach = r.reach ?? "0";
    const messages = String(pickMessages(r.actions));
    const roas = r.purchase_roas?.[0]?.value ?? "0";

    const existing = await campRepo.findOne({
      where: { adAccountId: input.adAccountId, metaCampaignId, day }
    });
    const dailyBudget = budgetByCampaign.get(metaCampaignId) ?? null;
    const campaignStatus = statusByCampaign.get(metaCampaignId) ?? null;

    if (existing) {
      existing.campaignName = r.campaign_name ?? existing.campaignName;
      existing.spend = spend;
      existing.impressions = impressions;
      existing.clicks = clicks;
      existing.ctr = ctr;
      existing.cpc = cpc;
      existing.conversions = conversions;
      existing.leads = leads;
      existing.reach = reach;
      existing.messages = messages;
      existing.roas = roas;
      existing.dailyBudget = dailyBudget;
      existing.campaignStatus = campaignStatus;
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
          reach,
          messages,
          roas,
          dailyBudget,
          campaignStatus
        })
      );
    }
  }

  // Campanhas novas na Meta ainda sem insights no dia — garante linha no banco para aparecer na listagem.
  const dayToday = campToday.find((r) => r.date_start)?.date_start ?? new Date().toISOString().slice(0, 10);
  for (const c of campaigns) {
    if (!c.id) continue;
    const dailyBudget = budgetByCampaign.get(c.id) ?? null;
    const campaignStatus = statusByCampaign.get(c.id) ?? null;
    const existingToday = await campRepo.findOne({
      where: { adAccountId: input.adAccountId, metaCampaignId: c.id, day: dayToday }
    });
    if (existingToday) {
      if (c.name) existingToday.campaignName = c.name;
      if (campaignStatus) existingToday.campaignStatus = campaignStatus;
      if (dailyBudget != null) existingToday.dailyBudget = dailyBudget;
      await campRepo.save(existingToday);
      continue;
    }
    await campRepo.save(
      campRepo.create({
        adAccountId: input.adAccountId,
        metaCampaignId: c.id,
        campaignName: c.name ?? null,
        day: dayToday,
        spend: "0",
        impressions: "0",
        clicks: "0",
        ctr: "0",
        cpc: "0",
        conversions: "0",
        leads: "0",
        reach: "0",
        messages: "0",
        roas: "0",
        dailyBudget,
        campaignStatus
      })
    );
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
  const { runLearningSuggestions } = await import("@/lib/agency-brain/learning-suggestion-service");
  await runLearningSuggestions(input.tenantId);
  const { recordSyncCompletedTimelineEvents } = await import(
    "@/lib/agency-brain/timeline-recorder"
  );
  await recordSyncCompletedTimelineEvents(input.tenantId, accounts.length);
  return { accountsSynced: accounts.length };
}
