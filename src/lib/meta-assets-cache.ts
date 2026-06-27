import "server-only";

import { redisGetJson, redisSetJson } from "@/lib/redis-cache";

/**
 * Short-lived cache for the heavy `/api/meta/assets` response (pages, pixels,
 * Instagram, WhatsApp, images, videos, custom conversions). Avoids re-hitting the
 * Meta Graph API on every navigation in the campaign creator, which was both slow
 * (10–30s) and a frequent source of rate limiting (#80004).
 */
const TTL_SEC = Number(process.env.META_ASSETS_CACHE_TTL_SEC ?? "180");
const TTL_MS = TTL_SEC * 1000;

type Entry<T> = { data: T; cachedAt: number };

const store = new Map<string, Entry<unknown>>();

function cacheKey(tenantId: string, adAccountId: string) {
  return `${tenantId}:${adAccountId}`;
}

function redisKey(key: string) {
  return `meta-assets:${key}`;
}

function entryValid<T>(entry: Entry<T> | null | undefined): entry is Entry<T> {
  return !!entry && Date.now() - entry.cachedAt <= TTL_MS;
}

export async function getCachedMetaAssets<T>(
  tenantId: string,
  adAccountId: string
): Promise<T | null> {
  const key = cacheKey(tenantId, adAccountId);
  const mem = store.get(key) as Entry<T> | undefined;
  if (entryValid(mem)) return mem.data;

  const fromRedis = await redisGetJson<Entry<T>>(redisKey(key));
  if (entryValid(fromRedis)) {
    store.set(key, fromRedis);
    return fromRedis.data;
  }
  return null;
}

export async function setCachedMetaAssets<T>(
  tenantId: string,
  adAccountId: string,
  data: T
): Promise<void> {
  const key = cacheKey(tenantId, adAccountId);
  const entry: Entry<T> = { data, cachedAt: Date.now() };
  store.set(key, entry);
  await redisSetJson(redisKey(key), entry, TTL_SEC);
}
