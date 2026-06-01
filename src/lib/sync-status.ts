import "server-only";

import { In } from "typeorm";

import { repositories } from "@/db/repositories";
import { getClientBySlugOrId } from "@/lib/app-context";

export type AccountSyncStatus = {
  adAccountId: string;
  metaAdAccountId: string;
  label: string | null;
  clientId: string;
  clientName: string;
  lastSyncedAt: string | null;
  lastError: string | null;
  status: "ok" | "failed" | "never";
};

export async function getTenantSyncStatus(tenantId: string, clientSlug?: string | null) {
  const {
    tenantSyncState: stateRepo,
    syncRun: runRepo,
    syncQueueJob: jobRepo,
    adAccount: adRepo,
    client: clientRepo
  } = await repositories();

  const state = await stateRepo.findOne({ where: { tenantId } });
  const lastRun = await runRepo.find({
    where: { tenantId },
    order: { createdAt: "DESC" },
    take: 1
  });

  let clients = await clientRepo.find({ where: { tenantId } });
  if (clientSlug) {
    const one = await getClientBySlugOrId(tenantId, clientSlug);
    clients = one ? [one] : [];
  }

  const clientIds = clients.map((c) => c.id);
  const accounts =
    clientIds.length > 0
      ? await adRepo.find({ where: { clientId: In(clientIds) } })
      : [];

  const jobs = accounts.length
    ? await jobRepo.find({
        where: { tenantId, adAccountId: In(accounts.map((a) => a.id)) },
        order: { processedAt: "DESC" }
      })
    : [];

  const latestByAccount = new Map<string, (typeof jobs)[0]>();
  for (const j of jobs) {
    if (!latestByAccount.has(j.adAccountId)) latestByAccount.set(j.adAccountId, j);
  }

  const clientName = new Map(clients.map((c) => [c.id, c.name]));

  const accountStatuses: AccountSyncStatus[] = accounts.map((a) => {
    const job = latestByAccount.get(a.id);
    let status: AccountSyncStatus["status"] = "never";
    if (job?.status === "done") status = "ok";
    if (job?.status === "failed") status = "failed";
    return {
      adAccountId: a.id,
      metaAdAccountId: a.metaAdAccountId,
      label: a.label ?? null,
      clientId: a.clientId,
      clientName: clientName.get(a.clientId) ?? "—",
      lastSyncedAt: job?.processedAt?.toISOString() ?? null,
      lastError: job?.lastError ?? null,
      status
    };
  });

  const run = lastRun[0];
  return {
    lastManualSyncAt: state?.lastManualSyncAt?.toISOString() ?? null,
    activeSyncRunId: state?.activeSyncRunId ?? null,
    lastRun: run
      ? {
          id: run.id,
          status: run.status,
          accountsTotal: run.accountsTotal,
          accountsDone: run.accountsDone,
          lastError: run.lastError,
          startedAt: run.startedAt?.toISOString() ?? null,
          finishedAt: run.finishedAt?.toISOString() ?? null
        }
      : null,
    accounts: accountStatuses
  };
}
