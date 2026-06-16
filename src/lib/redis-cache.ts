import "server-only";

import { createClient, type RedisClientType } from "redis";

/**
 * Cache JSON opcional — dois backends (primeiro configurado ganha):
 * 1. UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (HTTP REST, ideal Vercel)
 * 2. REDIS_URL (Redis Cloud — use só em servidor long-lived; na Vercel prefira Upstash REST)
 *
 * Sem nenhum configurado, operações retornam null (caller usa Map in-memory).
 */

const REDIS_OP_TIMEOUT_MS = Number(process.env.REDIS_OP_TIMEOUT_MS ?? "2000");
const REDIS_CONNECT_TIMEOUT_MS = Number(process.env.REDIS_CONNECT_TIMEOUT_MS ?? "2000");

/** TCP Redis costuma falhar/lentidão em serverless — desligue com REDIS_TCP_DISABLED=1 na Vercel. */
function isTcpRedisAllowed(): boolean {
  if (process.env.REDIS_TCP_DISABLED === "1") return false;
  if (process.env.VERCEL === "1" && process.env.REDIS_ALLOW_TCP_ON_VERCEL !== "1") return false;
  return true;
}

type UpstashConfig = { url: string; token: string };

function getUpstashConfig(): UpstashConfig | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

function getRedisUrl(): string | null {
  if (!isTcpRedisAllowed()) return null;
  const url = process.env.REDIS_URL?.trim();
  return url || null;
}

type CacheBackend = "upstash" | "redis";

function getTcpBackend(): CacheBackend | null {
  return getRedisUrl() ? "redis" : null;
}

let redisClient: RedisClientType | null = null;
let redisConnectPromise: Promise<RedisClientType | null> | null = null;
let redisConnectFailed = false;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("redis_timeout")), ms);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function getRedisClient(): Promise<RedisClientType | null> {
  const url = getRedisUrl();
  if (!url || redisConnectFailed) return null;
  if (redisClient?.isOpen) return redisClient;
  if (redisConnectPromise) return redisConnectPromise;

  redisConnectPromise = (async () => {
    try {
      const client = createClient({
        url,
        socket: {
          connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
          reconnectStrategy: () => false
        }
      });
      client.on("error", () => {
        /* evita unhandled rejection */
      });
      await withTimeout(client.connect(), REDIS_CONNECT_TIMEOUT_MS);
      redisClient = client;
      return client;
    } catch {
      redisConnectFailed = true;
      redisConnectPromise = null;
      try {
        await redisClient?.quit();
      } catch {
        /* ignore */
      }
      redisClient = null;
      return null;
    }
  })();

  return redisConnectPromise;
}

async function upstashCommand<T>(args: (string | number)[]): Promise<T | null> {
  const cfg = getUpstashConfig();
  if (!cfg) return null;
  try {
    const res = await withTimeout(
      fetch(cfg.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(args),
        cache: "no-store"
      }),
      REDIS_OP_TIMEOUT_MS
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: T };
    return json.result ?? null;
  } catch {
    return null;
  }
}

export function isRedisCacheEnabled(): boolean {
  return getUpstashConfig() != null || getTcpBackend() != null;
}

export async function redisGetJson<T>(key: string): Promise<T | null> {
  try {
    let raw: string | null = null;
    const upstash = getUpstashConfig();
    if (upstash) {
      raw = await upstashCommand<string>(["GET", key]);
    } else {
      const client = await getRedisClient();
      if (!client) return null;
      raw = await withTimeout(client.get(key), REDIS_OP_TIMEOUT_MS);
    }
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function redisSetJson(key: string, value: unknown, ttlSec: number): Promise<void> {
  const payload = JSON.stringify(value);
  try {
    const upstash = getUpstashConfig();
    if (upstash) {
      await upstashCommand(["SET", key, payload, "EX", ttlSec]);
      return;
    }
    const client = await getRedisClient();
    if (!client) return;
    await withTimeout(client.set(key, payload, { EX: ttlSec }), REDIS_OP_TIMEOUT_MS);
  } catch {
    /* fallback silencioso para in-memory */
  }
}

export async function redisDeleteByPrefix(prefix: string): Promise<void> {
  try {
    const upstash = getUpstashConfig();
    if (upstash) {
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
      const result = await withTimeout(
        client.scan(cursor, { MATCH: `${prefix}*`, COUNT: 100 }),
        REDIS_OP_TIMEOUT_MS
      );
      cursor = String(result.cursor);
      if (result.keys.length) {
        await withTimeout(client.del(result.keys), REDIS_OP_TIMEOUT_MS);
      }
    } while (cursor !== "0");
  } catch {
    /* ignore */
  }
}
