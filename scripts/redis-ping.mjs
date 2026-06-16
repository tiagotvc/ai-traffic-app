#!/usr/bin/env node
/**
 * Testa conexão Redis (REDIS_URL ou Upstash REST).
 * Uso: node scripts/redis-ping.mjs
 */
import "dotenv/config";
import { createClient } from "redis";

const url = process.env.REDIS_URL?.trim();
const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

async function pingRedisUrl() {
  const client = createClient({ url });
  await client.connect();
  const pong = await client.ping();
  const testKey = `ping:${Date.now()}`;
  await client.set(testKey, "ok", { EX: 10 });
  const val = await client.get(testKey);
  await client.del(testKey);
  await client.quit();
  return { backend: "REDIS_URL", pong, setGet: val === "ok" };
}

async function pingUpstash() {
  const res = await fetch(upstashUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${upstashToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(["PING"])
  });
  const json = await res.json();
  return { backend: "UPSTASH_REST", pong: json.result };
}

async function main() {
  if (upstashUrl && upstashToken) {
    const r = await pingUpstash();
    console.log("OK", r);
    return;
  }
  if (url) {
    const r = await pingRedisUrl();
    console.log("OK", r);
    return;
  }
  console.error("Defina REDIS_URL ou UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN no .env");
  process.exit(1);
}

main().catch((e) => {
  console.error("Falha:", e.message);
  process.exit(1);
});
