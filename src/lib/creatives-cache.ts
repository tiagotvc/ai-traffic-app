import "server-only";

import type { AdInsightMetrics, AdUsageRow } from "@/lib/meta-graph";
import { redisDeleteByPrefix, redisGetJson, redisSetJson } from "@/lib/redis-cache";

export type CachedAccountCreatives = {
  ads: AdUsageRow[];
  insights: Record<string, AdInsightMetrics>;
};

type CacheEntry = {
  data: CachedAccountCreatives;
  cachedAt: number;
};

const TTL_MS = Number(process.env.CREATIVES_CACHE_TTL_SEC ?? "180") * 1000;
const TTL_SEC = Math.round(TTL_MS / 1000);

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

function redisKey(key: string) {
  return `creatives:${key}`;
}

function entryValid(entry: CacheEntry | null): entry is CacheEntry {
  return !!entry && Date.now() - entry.cachedAt <= TTL_MS;
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
  if (!entryValid(entry)) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

export async function getCachedAccountCreativesAsync(
  tenantId: string,
  clientId: string,
  adAccountId: string,
  since: string,
  until: string
): Promise<CachedAccountCreatives | null> {
  const key = cacheKey(tenantId, clientId, adAccountId, since, until);
  const fromRedis = await redisGetJson<CacheEntry>(redisKey(key));
  if (entryValid(fromRedis)) {
    store.set(key, fromRedis);
    return fromRedis.data;
  }
  return getCachedAccountCreatives(tenantId, clientId, adAccountId, since, until);
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

export async function setCachedAccountCreativesAsync(
  tenantId: string,
  clientId: string,
  adAccountId: string,
  since: string,
  until: string,
  data: CachedAccountCreatives
) {
  const key = cacheKey(tenantId, clientId, adAccountId, since, until);
  const entry = { data, cachedAt: Date.now() };
  setCachedAccountCreatives(tenantId, clientId, adAccountId, since, until, data);
  await redisSetJson(redisKey(key), entry, TTL_SEC);
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

export async function clearTenantCreativesCache(tenantId: string) {
  const prefix = `${tenantId}:`;
  for (const key of [...store.keys()]) {
    if (key.startsWith(prefix)) store.delete(key);
  }
  await redisDeleteByPrefix(`creatives:${prefix}`);
}
