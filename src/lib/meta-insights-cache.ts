import "server-only";

import type { MetaCampaignInsightRow } from "@/lib/meta-graph";
import { redisDeleteByPrefix, redisGetJson, redisSetJson } from "@/lib/redis-cache";

type CacheEntry = {
  insights: MetaCampaignInsightRow[];
  cachedAt: number;
};

const TTL_MS = Number(process.env.META_INSIGHTS_CACHE_TTL_SEC ?? "180") * 1000;
const TTL_SEC = Math.round(TTL_MS / 1000);
const store = new Map<string, CacheEntry>();

function cacheKey(tenantId: string, adAccountId: string, since: string, until: string) {
  return `${tenantId}:${adAccountId}:${since.slice(0, 10)}:${until.slice(0, 10)}`;
}

function redisKey(key: string) {
  return `insights:${key}`;
}

function entryValid(entry: CacheEntry | null): entry is CacheEntry {
  return !!entry && Date.now() - entry.cachedAt <= TTL_MS;
}

export function getCachedCampaignInsights(
  tenantId: string,
  adAccountId: string,
  since: string,
  until: string
): { insights: MetaCampaignInsightRow[]; cachedAt: number } | null {
  const key = cacheKey(tenantId, adAccountId, since, until);
  const entry = store.get(key);
  if (!entry) return null;
  if (!entryValid(entry)) {
    store.delete(key);
    return null;
  }
  return { insights: entry.insights, cachedAt: entry.cachedAt };
}

export async function getCachedCampaignInsightsAsync(
  tenantId: string,
  adAccountId: string,
  since: string,
  until: string
): Promise<{ insights: MetaCampaignInsightRow[]; cachedAt: number } | null> {
  const key = cacheKey(tenantId, adAccountId, since, until);
  const fromRedis = await redisGetJson<CacheEntry>(redisKey(key));
  if (entryValid(fromRedis)) {
    store.set(key, fromRedis);
    return { insights: fromRedis.insights, cachedAt: fromRedis.cachedAt };
  }
  return getCachedCampaignInsights(tenantId, adAccountId, since, until);
}

export function setCachedCampaignInsights(
  tenantId: string,
  adAccountId: string,
  since: string,
  until: string,
  insights: MetaCampaignInsightRow[]
) {
  const key = cacheKey(tenantId, adAccountId, since, until);
  store.set(key, { insights, cachedAt: Date.now() });
}

export async function setCachedCampaignInsightsAsync(
  tenantId: string,
  adAccountId: string,
  since: string,
  until: string,
  insights: MetaCampaignInsightRow[]
) {
  const key = cacheKey(tenantId, adAccountId, since, until);
  const entry = { insights, cachedAt: Date.now() };
  setCachedCampaignInsights(tenantId, adAccountId, since, until, insights);
  await redisSetJson(redisKey(key), entry, TTL_SEC);
}

export function clearCachedCampaignInsights(
  tenantId: string,
  adAccountId: string,
  since: string,
  until: string
) {
  store.delete(cacheKey(tenantId, adAccountId, since, until));
}

/** Limpa cache in-memory de insights após sync manual (evita dados stale na UI). */
export async function clearTenantCampaignInsightsCache(tenantId: string) {
  const prefix = `${tenantId}:`;
  for (const key of [...store.keys()]) {
    if (key.startsWith(prefix)) store.delete(key);
  }
  await redisDeleteByPrefix(`insights:${prefix}`);
}
