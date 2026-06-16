import "server-only";

import type { AdInsightMetrics, AdUsageRow } from "@/lib/meta-graph";

export type CachedAccountCreatives = {
  ads: AdUsageRow[];
  insights: Record<string, AdInsightMetrics>;
};

type CacheEntry = {
  data: CachedAccountCreatives;
  cachedAt: number;
};

const TTL_MS = Number(process.env.CREATIVES_CACHE_TTL_SEC ?? "180") * 1000;

export function getCreativesCacheTtlSec(): number {
  return Math.round(TTL_MS / 1000);
}
const store = new Map<string, CacheEntry>();

function cacheKey(
  tenantId: string,
  clientId: string,
  adAccountId: string,
  since: string,
  until: string
) {
  return `${tenantId}:${clientId}:${adAccountId}:${since.slice(0, 10)}:${until.slice(0, 10)}`;
}

export function getCachedAccountCreatives(
  tenantId: string,
  clientId: string,
  adAccountId: string,
  since: string,
  until: string
): CachedAccountCreatives | null {
  const key = cacheKey(tenantId, clientId, adAccountId, since, until);
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > TTL_MS) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

export function setCachedAccountCreatives(
  tenantId: string,
  clientId: string,
  adAccountId: string,
  since: string,
  until: string,
  data: CachedAccountCreatives
) {
  const key = cacheKey(tenantId, clientId, adAccountId, since, until);
  store.set(key, { data, cachedAt: Date.now() });
}

export function clearCachedAccountCreatives(
  tenantId: string,
  clientId: string,
  adAccountId: string,
  since: string,
  until: string
) {
  store.delete(cacheKey(tenantId, clientId, adAccountId, since, until));
}
