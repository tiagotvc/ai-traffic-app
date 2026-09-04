import "server-only";

import { repositories } from "@/db/repositories";
import { listClientsForTenant } from "@/lib/app-context";
import { syncGoogleAdsForClient } from "@/lib/google-ads-sync";
import { refreshMetaSnapshotsForRange } from "@/lib/sync-meta";
import { getLinkedAdAccountsForTenant } from "@/lib/tenant-accounts";

export type RefreshPlatform = "meta" | "google";
const FRESH_MS = 10 * 60 * 1000;
const inflight = new Map<string, Promise<RangeRefreshItem>>();

export type RangeRefreshItem = {
  clientId: string;
  platform: RefreshPlatform;
  refreshed: boolean;
  cached: boolean;
  ok: boolean;
  error?: string;
};

function overlapsOrAdjacent(a: { since: string; until: string }, b: { since: string; until: string }) {
  const day = 86_400_000;
  return Date.parse(a.since) <= Date.parse(b.until) + day && Date.parse(b.since) <= Date.parse(a.until) + day;
}

async function refreshOne(input: {
  tenantId: string;
  clientId: string;
  platform: RefreshPlatform;
  since: string;
  until: string;
  metaAccessToken?: string;
  force?: boolean;
}): Promise<RangeRefreshItem> {
  const { dataRangeRefresh: repo } = await repositories();
  let state = await repo.findOne({ where: { tenantId: input.tenantId, clientId: input.clientId, platform: input.platform } });
  const fresh = !!state && Date.now() - state.refreshedAt.getTime() < FRESH_MS;
  if (!input.force && fresh && input.since >= state!.since && input.until <= state!.until) {
    return { clientId: input.clientId, platform: input.platform, refreshed: false, cached: true, ok: true };
  }

  let ok = false;
  let error: string | undefined;
  if (input.platform === "google") {
    const result = await syncGoogleAdsForClient(input.tenantId, input.clientId, { range: { since: input.since, until: input.until } });
    ok = result.ok;
    if (!result.ok) error = result.message ?? result.error;
  } else if (!input.metaAccessToken) {
    error = "not_connected";
  } else {
    const { accounts } = await getLinkedAdAccountsForTenant(input.tenantId);
    const selected = accounts.filter((account) => account.clientId === input.clientId);
    if (!selected.length) {
      error = "not_linked";
    } else {
      const result = await refreshMetaSnapshotsForRange({
        accounts: selected.map((account) => ({ adAccountId: account.id, metaAdAccountId: account.metaAdAccountId })),
        metaAccessToken: input.metaAccessToken,
        ranges: [{ since: input.since, until: input.until }]
      });
      ok = result.ok;
      error = result.error ?? undefined;
    }
  }

  if (ok) {
    const requested = { since: input.since, until: input.until };
    const canUnion = fresh && state && overlapsOrAdjacent(state, requested);
    if (!state) state = repo.create({ tenantId: input.tenantId, clientId: input.clientId, platform: input.platform });
    state.since = canUnion ? (state.since < input.since ? state.since : input.since) : input.since;
    state.until = canUnion ? (state.until > input.until ? state.until : input.until) : input.until;
    state.refreshedAt = new Date();
    await repo.save(state);
  }
  return { clientId: input.clientId, platform: input.platform, refreshed: ok, cached: false, ok, ...(error ? { error } : {}) };
}

export async function ensureFreshDataRange(input: {
  tenantId: string;
  clientId?: string;
  platforms: RefreshPlatform[];
  since: string;
  until: string;
  metaAccessToken?: string;
  force?: boolean;
}) {
  const clients = (await listClientsForTenant(input.tenantId)).filter((client) => !input.clientId || client.id === input.clientId);
  const tasks = clients.flatMap((client) => input.platforms.map((platform) => {
    const key = `${input.tenantId}:${client.id}:${platform}:${input.since}:${input.until}:${input.force ? 1 : 0}`;
    const running = inflight.get(key);
    if (running) return running;
    const promise = refreshOne({ ...input, clientId: client.id, platform }).finally(() => inflight.delete(key));
    inflight.set(key, promise);
    return promise;
  }));
  return Promise.all(tasks);
}
