import "server-only";

import { In, Between } from "typeorm";

import { repositories } from "@/db/repositories";
import { getEntitlements } from "@/lib/billing/entitlements";
import { getLinkedAdAccountsForTenant } from "@/lib/tenant-accounts";
import {
  fetchCampaignInsightsDailyForRange,
  fetchCampaigns,
  pickLeads,
  pickMessages,
  pickResults,
  type MetaCampaignInsightRow,
  type MetaCampaign
} from "@/lib/meta-graph";
import { addDaysIso, rollingDaysEndingYesterday } from "@/lib/report-period";
import type { SyncRun } from "@/db/entities/SyncRun";

import { runAgencyBrainPipeline } from "@/lib/agency-brain/brain-pipeline";
import { recordTimelineEvent } from "@/lib/agency-brain/timeline-service";
import { formatMetaGraphError } from "@/lib/meta-error";

type BackfillDepthDays = 7 | 30 | 90 | 180;

function capDepthByPlan(planSlug: string | null | undefined, requested: BackfillDepthDays): BackfillDepthDays {
  const caps: Record<string, BackfillDepthDays> = {
    free: 30,
    basic: 90,
    advanced: 90,
    agency: 180
  };
  const cap = caps[planSlug ?? ""] ?? 90;
  return requested <= cap ? requested : cap;
}

function splitRangeIntoChunks(since: string, until: string, chunkDays: number): Array<{ since: string; until: string }> {
  if (chunkDays <= 0) throw new Error("chunkDays must be > 0");
  const out: Array<{ since: string; until: string }> = [];
  const totalDays = Math.ceil((Date.parse(until) - Date.parse(since)) / 86_400_000) + 1;
  const chunks = Math.ceil(totalDays / chunkDays);
  for (let i = 0; i < chunks; i++) {
    const chunkSince = addDaysIso(since, i * chunkDays);
    const chunkUntil =
      i === chunks - 1 ? until : addDaysIso(since, (i + 1) * chunkDays - 1);
    out.push({ since: chunkSince, until: chunkUntil });
  }
  return out;
}

function toSnapshotRow(dayRow: MetaCampaignInsightRow): {
  metaCampaignId: string;
  campaignName: string | null;
  day: string;
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  cpc: string;
  conversions: string;
  leads: string;
  reach: string;
  messages: string;
  roas: string;
} {
  const metaCampaignId = dayRow.campaign_id ?? "";
  const day = dayRow.date_start ?? "";
  return {
    metaCampaignId,
    campaignName: dayRow.campaign_name ?? null,
    day,
    spend: dayRow.spend ?? "0",
    impressions: dayRow.impressions ?? "0",
    clicks: dayRow.clicks ?? "0",
    ctr: dayRow.ctr ?? "0",
    cpc: dayRow.cpc ?? "0",
    conversions: String(pickResults(dayRow)),
    leads: String(pickLeads(dayRow.actions)),
    reach: dayRow.reach ?? "0",
    messages: String(pickMessages(dayRow.actions)),
    roas: dayRow.purchase_roas?.[0]?.value ?? "0"
  };
}

async function upsertCampaignSnapshotsForRange(input: {
  tenantId: string;
  adAccountId: string;
  metaAdAccountId: string;
  metaAccessToken: string;
  since: string;
  until: string;
  depthDays: number;
}) {
  const { campaignMetricSnapshot: campRepo } = await repositories();

  const campaigns: MetaCampaign[] = await fetchCampaigns(input.metaAccessToken, input.metaAdAccountId).catch(() => []);
  const budgetByCampaign = new Map<string, string | null>(
    campaigns.map((c) => [c.id, c.daily_budget ? String(Number(c.daily_budget) / 100) : null])
  );
  const statusByCampaign = new Map<string, string | null>(campaigns.map((c) => [c.id, c.status ?? null]));

  const rows = await fetchCampaignInsightsDailyForRange(
    input.metaAccessToken,
    input.metaAdAccountId,
    input.since,
    input.until
  );

  const validRows = rows.filter((r) => r.campaign_id && r.date_start);
  if (!validRows.length) return;

  const byKey = new Map<string, ReturnType<typeof toSnapshotRow>>();
  for (const r of validRows) {
    const snap = toSnapshotRow(r);
    if (!snap.metaCampaignId || !snap.day) continue;
    byKey.set(`${snap.metaCampaignId}:${snap.day}`, snap);
  }

  const metaCampaignIds = [...new Set(validRows.map((r) => r.campaign_id).filter(Boolean))] as string[];
  const existing = await campRepo.find({
    where: {
      adAccountId: input.adAccountId,
      metaCampaignId: In(metaCampaignIds),
      day: Between(input.since, input.until)
    }
  });

  const existingByKey = new Map(existing.map((e) => [`${e.metaCampaignId}:${e.day}`, e]));

  const toSave = [...byKey.values()].map((snap) => {
    const existingRow = existingByKey.get(`${snap.metaCampaignId}:${snap.day}`);
    const dailyBudget = budgetByCampaign.get(snap.metaCampaignId) ?? null;
    const campaignStatus = statusByCampaign.get(snap.metaCampaignId) ?? null;
    if (existingRow) {
      existingRow.campaignName = snap.campaignName ?? existingRow.campaignName ?? null;
      existingRow.spend = snap.spend;
      existingRow.impressions = snap.impressions;
      existingRow.clicks = snap.clicks;
      existingRow.ctr = snap.ctr;
      existingRow.cpc = snap.cpc;
      existingRow.conversions = snap.conversions;
      existingRow.leads = snap.leads;
      existingRow.reach = snap.reach;
      existingRow.messages = snap.messages;
      existingRow.roas = snap.roas;
      existingRow.dailyBudget = dailyBudget;
      existingRow.campaignStatus = campaignStatus;
      return existingRow;
    }

    return campRepo.create({
      adAccountId: input.adAccountId,
      metaCampaignId: snap.metaCampaignId,
      campaignName: snap.campaignName,
      day: snap.day,
      spend: snap.spend,
      impressions: snap.impressions,
      clicks: snap.clicks,
      ctr: snap.ctr,
      cpc: snap.cpc,
      conversions: snap.conversions,
      leads: snap.leads,
      reach: snap.reach,
      messages: snap.messages,
      roas: snap.roas,
      dailyBudget: budgetByCampaign.get(snap.metaCampaignId) ?? null,
      campaignStatus: statusByCampaign.get(snap.metaCampaignId) ?? null
    });
  });

  if (toSave.length) await campRepo.save(toSave);
}

export async function enqueueHistoricalBackfill(input: {
  tenantId: string;
  metaAccessToken: string;
  depthDays: BackfillDepthDays;
  clientId?: string;
  triggeredByUserId?: string;
}) {
  const { syncRun: runRepo, syncQueueJob: jobRepo, tenantSyncState: stateRepo, adAccount: adRepo, client: clientRepo, clientMetaSettings: settingsRepo } =
    await repositories();

  const state = (await stateRepo.findOne({ where: { tenantId: input.tenantId } })) ?? stateRepo.create({ tenantId: input.tenantId });

  const now = Date.now();
  if (state.lastHistoricalBackfillAt) {
    const msSince = now - state.lastHistoricalBackfillAt.getTime();
    if (msSince < 7 * 24 * 60 * 60 * 1000) {
      return { ok: true, skipped: true, runId: null as string | null };
    }
  }

  const ent = await getEntitlements(input.tenantId);
  const cappedDepth = capDepthByPlan(ent.planSlug, input.depthDays);

  // Reutiliza a mesma elegibilidade de sync (syncEnabled no client_meta_settings).
  const clients = input.clientId
    ? await clientRepo.find({ where: { tenantId: input.tenantId, id: input.clientId } })
    : await clientRepo.find({ where: { tenantId: input.tenantId } });
  const clientIds = clients.map((c) => c.id);

  const settingsRows = clientIds.length ? await settingsRepo.find({ where: { clientId: In(clientIds) } }) : [];
  const settingsByClient = new Map(settingsRows.map((s) => [s.clientId, s]));

  const linkedAccounts = await getLinkedAdAccountsForTenant(input.tenantId);
  const accounts = linkedAccounts.accounts.filter((a) => clientIds.includes(a.clientId));
  const eligible = accounts.filter((a) => settingsByClient.get(a.clientId)?.syncEnabled !== false);

  if (!eligible.length) {
    return { ok: false, skipped: true, error: "Nenhuma conta elegível para backfill" } as const;
  }

  const run = await runRepo.save(
    runRepo.create({
      tenantId: input.tenantId,
      runType: "historical_backfill",
      status: "queued",
      accountsTotal: eligible.length,
      accountsDone: 0,
      depthDays: cappedDepth,
      daysTotal: cappedDepth,
      daysDone: 0
    })
  );

  for (const acc of eligible) {
    await jobRepo.save(
      jobRepo.create({
        tenantId: input.tenantId,
        syncRunId: run.id,
        adAccountId: acc.id,
        metaAdAccountId: acc.metaAdAccountId,
        priority: 50,
        status: "pending",
        scheduledAt: new Date()
      })
    );
  }

  state.historicalDepthDays = cappedDepth;
  await stateRepo.save(state);

  void processHistoricalBackfillQueue({
    tenantId: input.tenantId,
    syncRunId: run.id,
    metaAccessToken: input.metaAccessToken,
    triggeredByUserId: input.triggeredByUserId
  });

  return { ok: true, skipped: false, runId: run.id };
}

export async function getTenantHistoricalBackfillStatus(tenantId: string) {
  const { syncRun: runRepo } = await repositories();
  const active = await runRepo.findOne({
    where: {
      tenantId,
      runType: "historical_backfill",
      status: In(["queued", "running"])
    },
    order: { createdAt: "DESC" }
  });

  if (!active) return { ok: true, active: null };

  return {
    ok: true,
    active: {
      runId: active.id,
      status: active.status,
      accountsDone: active.accountsDone,
      accountsTotal: active.accountsTotal,
      daysDone: active.daysDone,
      daysTotal: active.daysTotal
    }
  };
}

export async function processHistoricalBackfillQueue(input: {
  tenantId: string;
  syncRunId: string;
  metaAccessToken: string;
  triggeredByUserId?: string;
}) {
  const { syncRun: runRepo, syncQueueJob: jobRepo, client: clientRepo } = await repositories();
  const run = await runRepo.findOne({ where: { id: input.syncRunId } });
  if (!run || run.runType !== "historical_backfill") return;

  run.status = "running";
  run.startedAt = new Date();
  await runRepo.save(run);

  const depthDays = run.depthDays ?? run.daysTotal ?? 90;
  const chunkDays = 30;
  const range = rollingDaysEndingYesterday(depthDays);
  const chunks = splitRangeIntoChunks(range.since, range.until, chunkDays);

  const jobs = await jobRepo.find({
    where: { tenantId: input.tenantId, syncRunId: input.syncRunId, status: "pending" },
    order: { priority: "ASC", scheduledAt: "ASC" }
  });

  let done = 0;
  for (const job of jobs) {
    job.status = "processing";
    await jobRepo.save(job);
    try {
      for (let ci = 0; ci < chunks.length; ci++) {
        const chunk = chunks[ci]!;
        await upsertCampaignSnapshotsForRange({
          tenantId: input.tenantId,
          adAccountId: job.adAccountId,
          metaAdAccountId: job.metaAdAccountId,
          metaAccessToken: input.metaAccessToken,
          since: chunk.since,
          until: chunk.until,
          depthDays
        });
        run.daysDone = Math.max(run.daysDone, Math.min(depthDays, (ci + 1) * chunkDays));
        await runRepo.save(run);
      }

      job.status = "done";
      job.processedAt = new Date();
      done += 1;
    } catch (e) {
      job.status = "failed";
      job.attempts += 1;
      job.lastError = formatMetaGraphError(e, undefined);
      job.processedAt = new Date();
      run.lastError = job.lastError ?? null;
    }

    await jobRepo.save(job);
    run.accountsDone = done;
    await runRepo.save(run);
  }

  const failedJobs = await jobRepo.find({ where: { syncRunId: input.syncRunId, status: "failed" } });
  run.status = failedJobs.length ? "partial" : "completed";
  run.finishedAt = new Date();
  await runRepo.save(run);

  if (run.status === "completed") {
    const { tenantSyncState: stateRepo } = await repositories();
    const state =
      (await stateRepo.findOne({ where: { tenantId: input.tenantId } })) ??
      stateRepo.create({ tenantId: input.tenantId });
    state.lastHistoricalBackfillAt = new Date();
    state.historicalDepthDays = depthDays;
    await stateRepo.save(state);
  }

  // Após backfill, roda o pipeline por cliente (sequencial).
  const clients = await clientRepo.find({ where: { tenantId: input.tenantId } });
  for (const c of clients) {
    try {
      await runAgencyBrainPipeline(input.tenantId, c.id);
      await recordTimelineEvent(input.tenantId, c.id, {
        type: "sync_completed",
        title: "Backfill histórico Meta concluído",
        description: `Dados históricos atualizados para este cliente (janela ${depthDays}d).`,
        metadata: { backfillDepthDays: depthDays, syncRunId: run.id }
      });
    } catch {
      // continue
    }
  }
}

