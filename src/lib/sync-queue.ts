import "server-only";

import { In } from "typeorm";

import { repositories } from "@/db/repositories";
import { priorityToNumber } from "@/lib/client-meta-settings";
import { runMetaSyncForAccount } from "@/lib/sync-meta";

const MANUAL_COOLDOWN_MS = 10 * 60 * 1000;

export async function canManualSync(tenantId: string): Promise<{ ok: boolean; retryAfterSec?: number }> {
  const { tenantSyncState: stateRepo } = await repositories();
  let state = await stateRepo.findOne({ where: { tenantId } });
  if (!state?.lastManualSyncAt) return { ok: true };
  const elapsed = Date.now() - state.lastManualSyncAt.getTime();
  if (elapsed >= MANUAL_COOLDOWN_MS) return { ok: true };
  return { ok: false, retryAfterSec: Math.ceil((MANUAL_COOLDOWN_MS - elapsed) / 1000) };
}

export async function enqueueTenantSync(input: {
  tenantId: string;
  defaultClientId: string;
  metaAccessToken: string;
  manual?: boolean;
  clientId?: string;
  adAccountIds?: string[];
}) {
  const {
    syncRun: runRepo,
    syncQueueJob: jobRepo,
    adAccount: adRepo,
    client: clientRepo,
    clientMetaSettings: settingsRepo,
    tenantSyncState: stateRepo
  } = await repositories();

  if (input.manual) {
    const gate = await canManualSync(input.tenantId);
    if (!gate.ok) {
      throw new Error(`Aguarde ${gate.retryAfterSec}s antes de sincronizar novamente.`);
    }
  }

  const clients = await clientRepo.find({ where: { tenantId: input.tenantId } });
  const clientIds = clients.map((c) => c.id);
  const settingsRows =
    clientIds.length > 0
      ? await settingsRepo.find({ where: { clientId: In(clientIds) } })
      : [];
  const settingsByClient = new Map(settingsRows.map((s) => [s.clientId, s]));

  let accounts = await adRepo.find({
    where: clientIds.length ? { clientId: In(clientIds) } : { clientId: input.defaultClientId }
  });

  if (input.clientId) {
    accounts = accounts.filter((a) => a.clientId === input.clientId);
  }
  if (input.adAccountIds?.length) {
    const set = new Set(input.adAccountIds);
    accounts = accounts.filter((a) => set.has(a.id));
  }

  const eligible = accounts.filter((a) => {
    const s = settingsByClient.get(a.clientId);
    return s?.syncEnabled !== false;
  });

  const run = await runRepo.save(
    runRepo.create({
      tenantId: input.tenantId,
      status: "queued",
      accountsTotal: eligible.length,
      accountsDone: 0
    })
  );

  for (const account of eligible) {
    const s = settingsByClient.get(account.clientId);
    await jobRepo.save(
      jobRepo.create({
        tenantId: input.tenantId,
        syncRunId: run.id,
        adAccountId: account.id,
        metaAdAccountId: account.metaAdAccountId,
        priority: priorityToNumber(s?.syncPriority ?? "normal"),
        status: "pending",
        scheduledAt: new Date()
      })
    );
  }

  let state = await stateRepo.findOne({ where: { tenantId: input.tenantId } });
  if (!state) state = stateRepo.create({ tenantId: input.tenantId });
  state.activeSyncRunId = run.id;
  if (input.manual) state.lastManualSyncAt = new Date();
  await stateRepo.save(state);

  await processSyncQueue({
    tenantId: input.tenantId,
    syncRunId: run.id,
    metaAccessToken: input.metaAccessToken
  });

  return run;
}

export async function processSyncQueue(input: {
  tenantId: string;
  syncRunId: string;
  metaAccessToken: string;
}) {
  const { syncRun: runRepo, syncQueueJob: jobRepo } = await repositories();
  const run = await runRepo.findOne({ where: { id: input.syncRunId } });
  if (!run) return;

  run.status = "running";
  run.startedAt = new Date();
  await runRepo.save(run);

  const jobs = await jobRepo.find({
    where: { syncRunId: input.syncRunId, status: "pending" },
    order: { priority: "ASC", scheduledAt: "ASC" }
  });

  let done = 0;
  for (const job of jobs) {
    job.status = "processing";
    await jobRepo.save(job);
    try {
      await runMetaSyncForAccount({
        tenantId: input.tenantId,
        adAccountId: job.adAccountId,
        metaAdAccountId: job.metaAdAccountId,
        metaAccessToken: input.metaAccessToken
      });
      job.status = "done";
      job.processedAt = new Date();
      done += 1;
    } catch (e) {
      job.status = "failed";
      job.attempts += 1;
      const { formatMetaGraphError } = await import("@/lib/meta-error");
      job.lastError = formatMetaGraphError(e);
      job.processedAt = new Date();
      run.lastError = job.lastError;
    }
    await jobRepo.save(job);
    run.accountsDone = done;
    await runRepo.save(run);
  }

  const failedJobs = await jobRepo.find({ where: { syncRunId: input.syncRunId, status: "failed" } });
  run.status = failedJobs.length ? "partial" : "completed";
  run.finishedAt = new Date();
  await runRepo.save(run);

  const { runAlertEngine } = await import("@/lib/alert-engine");
  const { fetchCampaigns } = await import("@/lib/meta-graph");
  const { getLinkedAdAccountsForTenant } = await import("@/lib/tenant-accounts");
  const { accounts } = await getLinkedAdAccountsForTenant(input.tenantId);
  const campaignMeta = new Map<string, import("@/lib/meta-graph").MetaCampaign>();
  for (const a of accounts) {
    try {
      const camps = await fetchCampaigns(input.metaAccessToken, a.metaAdAccountId);
      for (const c of camps) campaignMeta.set(c.id, c);
    } catch {
      // skip
    }
  }
  await runAlertEngine(input.tenantId, campaignMeta);
  const { runAutomationEngine } = await import("@/lib/automation-engine");
  await runAutomationEngine(input.tenantId, input.metaAccessToken, campaignMeta);
}
