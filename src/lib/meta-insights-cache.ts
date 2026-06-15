import "server-only";

import type { MetaCampaignInsightRow } from "@/lib/meta-graph";

type CacheEntry = {
  insights: MetaCampaignInsightRow[];
  cachedAt: number;
};

const TTL_MS = Number(process.env.META_INSIGHTS_CACHE_TTL_SEC ?? "180") * 1000;
const store = new Map<string, CacheEntry>();

function cacheKey(tenantId: string, adAccountId: string, since: string, until: string) {
  return `${tenantId}:${adAccountId}:${since.slice(0, 10)}:${until.slice(0, 10)}`;
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
  if (Date.now() - entry.cachedAt > TTL_MS) {
    store.delete(key);
    return null;
  }
  return { insights: entry.insights, cachedAt: entry.cachedAt };
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

export function clearCachedCampaignInsights(
  tenantId: string,
  adAccountId: string,
  since: string,
  until: string
) {
  store.delete(cacheKey(tenantId, adAccountId, since, until));
}

/** Limpa cache in-memory de insights após sync manual (evita dados stale na UI). */
export function clearTenantCampaignInsightsCache(tenantId: string) {
  const prefix = `${tenantId}:`;
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
