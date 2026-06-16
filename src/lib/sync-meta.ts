import "server-only";

import { In, IsNull } from "typeorm";
import type { Repository } from "typeorm";

import type { CampaignMetricSnapshot } from "@/db/entities/CampaignMetricSnapshot";
import type { MetricSnapshot } from "@/db/entities/MetricSnapshot";
import type { AdMetricSnapshot } from "@/db/entities/AdMetricSnapshot";
import type { MetaCampaign } from "@/lib/meta-graph";
import {
  fetchAccountInsightsDaily,
  fetchAdsetInsightsDaily,
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
import { mapLimit } from "@/lib/concurrency";

type MetricRowInput = {
  day: string;
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  cpc: string;
  conversions: string;
  reach: string;
  messages: string;
  roas: string;
};

type CampaignMetricRowInput = MetricRowInput & {
  metaCampaignId: string;
  campaignName: string | null;
  leads: string;
  dailyBudget: string | null;
  campaignStatus: string | null;
};

type AdsetMetricRowInput = MetricRowInput & {
  metaCampaignId: string;
  metaAdsetId: string;
  adsetName: string | null;
  leads: string;
};

async function bulkUpsertMetricSnapshots(
  repo: Repository<MetricSnapshot>,
  adAccountId: string,
  rows: MetricRowInput[]
) {
  if (!rows.length) return;
  const days = [...new Set(rows.map((r) => r.day))];
  const existing = await repo.find({ where: { adAccountId, day: In(days) } });
  const byDay = new Map(existing.map((e) => [e.day, e]));
  const toSave = rows.map((row) => {
    const ex = byDay.get(row.day);
    if (ex) {
      ex.spend = row.spend;
      ex.impressions = row.impressions;
      ex.clicks = row.clicks;
      ex.ctr = row.ctr;
      ex.cpc = row.cpc;
      ex.conversions = row.conversions;
      ex.reach = row.reach;
      ex.messages = row.messages;
      ex.roas = row.roas;
      return ex;
    }
    return repo.create({ adAccountId, ...row });
  });
  await repo.save(toSave);
}

async function bulkUpsertCampaignMetricSnapshots(
  repo: Repository<CampaignMetricSnapshot>,
  adAccountId: string,
  rows: CampaignMetricRowInput[]
) {
  if (!rows.length) return;
  const days = [...new Set(rows.map((r) => r.day))];
  const campaignIds = [...new Set(rows.map((r) => r.metaCampaignId))];
  const existing = await repo.find({
    where: { adAccountId, metaCampaignId: In(campaignIds), day: In(days) }
  });
  const byKey = new Map(existing.map((e) => [`${e.metaCampaignId}:${e.day}`, e]));
  const toSave = rows.map((row) => {
    const ex = byKey.get(`${row.metaCampaignId}:${row.day}`);
    if (ex) {
      ex.campaignName = row.campaignName ?? ex.campaignName ?? null;
      ex.spend = row.spend;
      ex.impressions = row.impressions;
      ex.clicks = row.clicks;
      ex.ctr = row.ctr;
      ex.cpc = row.cpc;
      ex.conversions = row.conversions;
      ex.leads = row.leads;
      ex.reach = row.reach;
      ex.messages = row.messages;
      ex.roas = row.roas;
      ex.dailyBudget = row.dailyBudget;
      ex.campaignStatus = row.campaignStatus;
      return ex;
    }
    return repo.create({ adAccountId, ...row });
  });
  await repo.save(toSave);
}

async function bulkUpsertAdsetMetricSnapshots(
  repo: Repository<AdMetricSnapshot>,
  adAccountId: string,
  rows: AdsetMetricRowInput[]
) {
  if (!rows.length) return;
  const days = [...new Set(rows.map((r) => r.day))];
  const adsetIds = [...new Set(rows.map((r) => r.metaAdsetId))];
  const existing = await repo.find({
    where: { adAccountId, metaAdsetId: In(adsetIds), day: In(days), metaAdId: IsNull() }
  });
  const byKey = new Map(existing.map((e) => [`${e.metaAdsetId}:${e.day}`, e]));
  const toSave = rows.map((row) => {
    const ex = byKey.get(`${row.metaAdsetId}:${row.day}`);
    if (ex) {
      ex.metaCampaignId = row.metaCampaignId;
      ex.adsetName = row.adsetName ?? ex.adsetName ?? null;
      ex.spend = row.spend;
      ex.impressions = row.impressions;
      ex.clicks = row.clicks;
      ex.ctr = row.ctr;
      ex.cpc = row.cpc;
      ex.conversions = row.conversions;
      ex.leads = row.leads;
      ex.reach = row.reach;
      ex.messages = row.messages;
      ex.roas = row.roas;
      return ex;
    }
    return repo.create({ adAccountId, metaAdId: null, ...row });
  });
  await repo.save(toSave);
}

export async function runMetaSyncForAccount(input: {
  tenantId: string;
  adAccountId: string;
  metaAdAccountId: string;
  metaAccessToken: string;
}) {
  const {
    metricSnapshot: metricsRepo,
    campaignMetricSnapshot: campRepo,
    adMetricSnapshot: adRepo
  } = await repositories();

  const [historyRows, todayRows] = await Promise.all([
    fetchAccountInsightsDaily(input.metaAccessToken, input.metaAdAccountId),
    fetchAccountInsightsDaily(input.metaAccessToken, input.metaAdAccountId, "today").catch(() => [])
  ]);
  const accountRows = [...historyRows, ...todayRows]
    .filter((r) => r.date_start)
    .map((r) => ({
      day: r.date_start!,
      spend: r.spend ?? "0",
      impressions: r.impressions ?? "0",
      clicks: r.clicks ?? "0",
      ctr: r.ctr ?? "0",
      cpc: r.cpc ?? "0",
      conversions: String(pickResults(r)),
      reach: r.reach ?? "0",
      messages: String(pickMessages(r.actions)),
      roas: r.purchase_roas?.[0]?.value ?? "0"
    }));
  await bulkUpsertMetricSnapshots(metricsRepo, input.adAccountId, accountRows);

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

  const [campHistory, campToday, adsetHistory, adsetToday] = await Promise.all([
    fetchCampaignInsightsDaily(input.metaAccessToken, input.metaAdAccountId),
    fetchCampaignInsightsDaily(input.metaAccessToken, input.metaAdAccountId, "today").catch(() => []),
    fetchAdsetInsightsDaily(input.metaAccessToken, input.metaAdAccountId),
    fetchAdsetInsightsDaily(input.metaAccessToken, input.metaAdAccountId, "today").catch(() => [])
  ]);

  const campRows: CampaignMetricRowInput[] = [...campHistory, ...campToday]
    .filter((r) => r.date_start && r.campaign_id)
    .map((r) => {
      const metaCampaignId = r.campaign_id!;
      return {
        metaCampaignId,
        campaignName: r.campaign_name ?? null,
        day: r.date_start!,
        spend: r.spend ?? "0",
        impressions: r.impressions ?? "0",
        clicks: r.clicks ?? "0",
        ctr: r.ctr ?? "0",
        cpc: r.cpc ?? "0",
        conversions: String(pickResults(r)),
        leads: String(pickLeads(r.actions)),
        reach: r.reach ?? "0",
        messages: String(pickMessages(r.actions)),
        roas: r.purchase_roas?.[0]?.value ?? "0",
        dailyBudget: budgetByCampaign.get(metaCampaignId) ?? null,
        campaignStatus: statusByCampaign.get(metaCampaignId) ?? null
      };
    });
  await bulkUpsertCampaignMetricSnapshots(campRepo, input.adAccountId, campRows);

  const adsetRows: AdsetMetricRowInput[] = [...adsetHistory, ...adsetToday]
    .filter((r) => r.date_start && r.adset_id && r.campaign_id)
    .map((r) => ({
      metaCampaignId: r.campaign_id!,
      metaAdsetId: r.adset_id!,
      adsetName: r.adset_name ?? null,
      day: r.date_start!,
      spend: r.spend ?? "0",
      impressions: r.impressions ?? "0",
      clicks: r.clicks ?? "0",
      ctr: r.ctr ?? "0",
      cpc: r.cpc ?? "0",
      conversions: String(pickResults(r)),
      leads: String(pickLeads(r.actions)),
      reach: r.reach ?? "0",
      messages: String(pickMessages(r.actions)),
      roas: r.purchase_roas?.[0]?.value ?? "0"
    }));
  await bulkUpsertAdsetMetricSnapshots(adRepo, input.adAccountId, adsetRows);

  const dayToday = campToday.find((r) => r.date_start)?.date_start ?? new Date().toISOString().slice(0, 10);
  const existingToday = await campRepo.find({
    where: { adAccountId: input.adAccountId, day: dayToday }
  });
  const existingTodayByCampaign = new Map(existingToday.map((e) => [e.metaCampaignId, e]));

  const placeholderRows: CampaignMetricRowInput[] = [];
  for (const c of campaigns) {
    if (!c.id) continue;
    if (existingTodayByCampaign.has(c.id)) {
      const row = existingTodayByCampaign.get(c.id)!;
      if (c.name) row.campaignName = c.name;
      const st = statusByCampaign.get(c.id);
      if (st) row.campaignStatus = st;
      const db = budgetByCampaign.get(c.id);
      if (db != null) row.dailyBudget = db;
      placeholderRows.push({
        metaCampaignId: c.id,
        campaignName: row.campaignName ?? c.name ?? null,
        day: dayToday,
        spend: row.spend,
        impressions: row.impressions,
        clicks: row.clicks,
        ctr: row.ctr,
        cpc: row.cpc,
        conversions: row.conversions,
        leads: row.leads,
        reach: row.reach,
        messages: row.messages,
        roas: row.roas,
        dailyBudget: row.dailyBudget ?? budgetByCampaign.get(c.id) ?? null,
        campaignStatus: row.campaignStatus ?? statusByCampaign.get(c.id) ?? null
      });
      continue;
    }
    placeholderRows.push({
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
      dailyBudget: budgetByCampaign.get(c.id) ?? null,
      campaignStatus: statusByCampaign.get(c.id) ?? null
    });
  }
  if (placeholderRows.length) {
    await bulkUpsertCampaignMetricSnapshots(campRepo, input.adAccountId, placeholderRows);
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

  const results = await mapLimit(accounts, 3, async (account) => {
    try {
      const { campaigns } = await runMetaSyncForAccount({
        tenantId: input.tenantId,
        adAccountId: account.id,
        metaAdAccountId: account.metaAdAccountId,
        metaAccessToken: input.metaAccessToken
      });
      return { ok: true as const, campaigns };
    } catch {
      return { ok: false as const, campaigns: [] as MetaCampaign[] };
    }
  });

  for (const r of results) {
    if (r.ok) {
      for (const c of r.campaigns) campaignMeta.set(c.id, c);
    }
  }

  await runAlertEngine(input.tenantId, campaignMeta);
  await runAutomationEngine(input.tenantId, input.metaAccessToken, campaignMeta);
  const { runAgencyBrainPipeline } = await import("@/lib/agency-brain/brain-pipeline");
  await runAgencyBrainPipeline(input.tenantId);
  const { recordSyncCompletedTimelineEvents } = await import(
    "@/lib/agency-brain/timeline-recorder"
  );
  await recordSyncCompletedTimelineEvents(input.tenantId, accounts.length);
  return { accountsSynced: accounts.length };
}
