import "server-only";

import { createClient, type RedisClientType } from "redis";

/**
 * Cache JSON opcional — dois backends (primeiro configurado ganha):
 * 1. UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (HTTP REST, ideal Vercel)
 * 2. REDIS_URL (Redis Cloud / redis.io, protocolo redis://)
 *
 * Sem nenhum configurado, operações retornam null (caller usa Map in-memory).
 */

type UpstashConfig = { url: string; token: string };

function getUpstashConfig(): UpstashConfig | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

function getRedisUrl(): string | null {
  const url = process.env.REDIS_URL?.trim();
  return url || null;
}

type CacheBackend = "upstash" | "redis";

function getCacheBackend(): CacheBackend | null {
  if (getUpstashConfig()) return "upstash";
  if (getRedisUrl()) return "redis";
  return null;
}

let redisClient: RedisClientType | null = null;
let redisConnectPromise: Promise<RedisClientType | null> | null = null;

async function getRedisClient(): Promise<RedisClientType | null> {
  const url = getRedisUrl();
  if (!url) return null;
  if (redisClient?.isOpen) return redisClient;
  if (redisConnectPromise) return redisConnectPromise;

  redisConnectPromise = (async () => {
    try {
      const client = createClient({ url });
      client.on("error", () => {
        /* evita unhandled rejection; próxima op tenta reconectar */
      });
      await client.connect();
      redisClient = client;
      return client;
    } catch {
      redisConnectPromise = null;
      return null;
    }
  })();

  return redisConnectPromise;
}

async function upstashCommand<T>(args: (string | number)[]): Promise<T | null> {
  const cfg = getUpstashConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(args),
      cache: "no-store"
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: T };
    return json.result ?? null;
  } catch {
    return null;
  }
}

export function isRedisCacheEnabled(): boolean {
  return getCacheBackend() != null;
}

export async function redisGetJson<T>(key: string): Promise<T | null> {
  const backend = getCacheBackend();
  if (!backend) return null;

  try {
    let raw: string | null = null;
    if (backend === "upstash") {
      raw = await upstashCommand<string>(["GET", key]);
    } else {
      const client = await getRedisClient();
      if (!client) return null;
      raw = await client.get(key);
    }
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function redisSetJson(key: string, value: unknown, ttlSec: number): Promise<void> {
  const backend = getCacheBackend();
  if (!backend) return;

  const payload = JSON.stringify(value);
  try {
    if (backend === "upstash") {
      await upstashCommand(["SET", key, payload, "EX", ttlSec]);
    } else {
      const client = await getRedisClient();
      if (!client) return;
      await client.set(key, payload, { EX: ttlSec });
    }
  } catch {
    /* fallback silencioso para in-memory */
  }
}

export async function redisDeleteByPrefix(prefix: string): Promise<void> {
  const backend = getCacheBackend();
  if (!backend) return;

  try {
    if (backend === "upstash") {
      let cursor = "0";
      do {
        const scan = await upstashCommand<[string, string[]]>([
          "SCAN",
          cursor,
          "MATCH",
          `${prefix}*`,
          "COUNT",
          100
        ]);
        if (!scan) break;
        cursor = scan[0];
        const keys = scan[1] ?? [];
        if (keys.length) {
          await upstashCommand(["DEL", ...keys]);
        }
      } while (cursor !== "0");
      return;
    }

    const client = await getRedisClient();
    if (!client) return;
    let cursor = "0";
    do {
      const result = await client.scan(cursor, { MATCH: `${prefix}*`, COUNT: 100 });
      cursor = String(result.cursor);
      if (result.keys.length) {
        await client.del(result.keys);
      }
    } while (cursor !== "0");
  } catch {
    /* ignore */
  }
}
