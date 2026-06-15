import "server-only";

import { In } from "typeorm";

import { repositories } from "@/db/repositories";
import { priorityToNumber } from "@/lib/client-meta-settings";
import { runMetaSyncForAccount } from "@/lib/sync-meta";

const MANUAL_COOLDOWN_MS = 3 * 60 * 1000;

export function formatSyncCooldownMessage(retryAfterSec: number): string {
  const mins = Math.max(1, Math.ceil(retryAfterSec / 60));
  return mins === 1
    ? "Sincronização disponível em cerca de 1 min."
    : `Sincronização disponível em cerca de ${mins} min.`;
}

export class SyncCooldownError extends Error {
  readonly code = "sync_cooldown" as const;
  readonly retryAfterSec: number;

  constructor(retryAfterSec: number) {
    super(formatSyncCooldownMessage(retryAfterSec));
    this.name = "SyncCooldownError";
    this.retryAfterSec = retryAfterSec;
  }
}

export class SyncNoAccountsError extends Error {
  readonly code = "sync_no_accounts" as const;

  constructor(message: string) {
    super(message);
    this.name = "SyncNoAccountsError";
  }
}

function resolveNoAccountsMessage(input: {
  clientId?: string;
  accounts: Array<{ clientId: string }>;
  eligibleCount: number;
}): string {
  if (input.eligibleCount > 0) return "";

  if (input.clientId) {
    const forClient = input.accounts.filter((a) => a.clientId === input.clientId);
    if (forClient.length === 0) {
      return "Este cliente não tem contas de anúncio vinculadas. Vincule uma conta Meta nas configurações do cliente antes de sincronizar.";
    }
    return "A sincronização está desativada para as contas deste cliente. Ative em Configurações do cliente.";
  }

  if (input.accounts.length === 0) {
    return "Nenhuma conta de anúncio vinculada no workspace. Vincule contas aos clientes antes de sincronizar.";
  }

  return "Nenhuma conta elegível para sincronizar.";
}

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
  triggeredByUserId?: string;
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
      throw new SyncCooldownError(gate.retryAfterSec ?? 60);
    }
  } else {
    const { assertFeature } = await import("@/lib/billing/entitlements");
    await assertFeature(input.tenantId, "allowAutoSync");
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

  if (eligible.length === 0) {
    throw new SyncNoAccountsError(
      resolveNoAccountsMessage({
        clientId: input.clientId,
        accounts,
        eligibleCount: eligible.length
      })
    );
  }

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
  if (input.manual && eligible.length > 0) state.lastManualSyncAt = new Date();
  await stateRepo.save(state);

  await processSyncQueue({
    tenantId: input.tenantId,
    syncRunId: run.id,
    metaAccessToken: input.metaAccessToken,
    triggeredByUserId: input.triggeredByUserId
  });

  return (await runRepo.findOne({ where: { id: run.id } })) ?? run;
}

export async function processSyncQueue(input: {
  tenantId: string;
  syncRunId: string;
  metaAccessToken: string;
  triggeredByUserId?: string;
}) {
  const { syncRun: runRepo, syncQueueJob: jobRepo } = await repositories();
  const run = await runRepo.findOne({ where: { id: input.syncRunId } });
  if (!run) return;

  const { getMetaConnectionInfo } = await import("@/lib/meta-auth-store");
  const metaCtx = input.triggeredByUserId
    ? await getMetaConnectionInfo(input.tenantId, input.triggeredByUserId)
    : null;
  const errorContext = metaCtx
    ? { isWorkspaceMember: metaCtx.role === "member", tokenSource: metaCtx.tokenSource }
    : undefined;

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
      job.lastError = formatMetaGraphError(e, errorContext);
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

  const { clearTenantCampaignInsightsCache } = await import("@/lib/meta-insights-cache");
  clearTenantCampaignInsightsCache(input.tenantId);

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
  const { runLearningSuggestions } = await import("@/lib/agency-brain/learning-suggestion-service");
  await runLearningSuggestions(input.tenantId);
}
