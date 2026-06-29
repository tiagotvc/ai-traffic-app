import "server-only";

import { redisGetJson, redisSetJson } from "@/lib/redis-cache";

/**
 * Cache de pesquisa de mercado (searchapi é caro/limitado — plano free ~100/mês).
 * Estratégia: **dados primeiro**. O resultado é cacheado por NICHO+PAÍS (não por
 * usuário) → 1 chamada ao searchapi por nicho serve TODOS os usuários durante o TTL.
 * Entrar no criador de campanha/persona com um nicho já pesquisado = 0 chamadas.
 *
 * Fallback in-memory quando não há Redis (dev / servidor long-lived).
 */
const TTL_SEC = Number(process.env.MARKET_RESEARCH_TTL_SEC ?? 604_800); // 7 dias
const MONTHLY_BUDGET = Number(process.env.SEARCHAPI_MONTHLY_BUDGET ?? 90); // margem sob o limite de 100
const MONTH_TTL_SEC = 2_678_400; // ~31 dias

const mem = new Map<string, { value: unknown; exp: number }>();

function memGet<T>(key: string): T | null {
  const m = mem.get(key);
  if (m && m.exp > Date.now()) return m.value as T;
  if (m) mem.delete(key);
  return null;
}
function memSet(key: string, value: unknown, ttlSec: number): void {
  mem.set(key, { value, exp: Date.now() + ttlSec * 1000 });
}

/** Chave estável por escopo + país + nicho normalizado. */
export function researchCacheKey(scope: string, niche: string | null | undefined, country: string | null | undefined): string {
  const n = (niche ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `mktres:${scope}:${(country || "BR").toUpperCase()}:${n || "geral"}`;
}

export async function getCachedResearch<T>(key: string): Promise<T | null> {
  const r = await redisGetJson<T>(key);
  if (r != null) return r;
  return memGet<T>(key);
}

export async function setCachedResearch(key: string, value: unknown, ttlSec = TTL_SEC): Promise<void> {
  await redisSetJson(key, value, ttlSec);
  memSet(key, value, ttlSec);
}

// ── Orçamento mensal do searchapi (soft cap, protege o limite do plano) ──────────
function monthKey(): string {
  const d = new Date();
  return `mktres:searchapi:count:${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function readMonthCount(): Promise<number> {
  const k = monthKey();
  return (await redisGetJson<number>(k)) ?? memGet<number>(k) ?? 0;
}

/** Há orçamento para mais uma chamada ao searchapi neste mês? */
export async function canSpendSearchApi(): Promise<boolean> {
  if (!MONTHLY_BUDGET || MONTHLY_BUDGET <= 0) return true;
  return (await readMonthCount()) < MONTHLY_BUDGET;
}

/** Registra 1 chamada ao searchapi (best-effort; não atômico, suficiente p/ soft cap). */
export async function recordSearchApiSpend(): Promise<void> {
  const k = monthKey();
  const next = (await readMonthCount()) + 1;
  await redisSetJson(k, next, MONTH_TTL_SEC);
  memSet(k, next, MONTH_TTL_SEC);
}

export async function searchApiBudgetStatus(): Promise<{ used: number; budget: number; remaining: number }> {
  const used = await readMonthCount();
  return { used, budget: MONTHLY_BUDGET, remaining: Math.max(0, MONTHLY_BUDGET - used) };
}
