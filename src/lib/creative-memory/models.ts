import "server-only";

import { DEFAULT_GEMINI_MODEL } from "@/lib/gemini";

const PLAN_RANK: Record<string, number> = {
  free: 0,
  basic: 1,
  advanced: 2,
  agency: 3
};

/** Melhor modelo primeiro; em 429/503 o gemini.ts desce na cadeia automaticamente. */
export function resolveCreativeMemoryModelChain(planSlug: string): string[] {
  const rank = PLAN_RANK[planSlug] ?? 0;
  const byPlan =
    rank >= PLAN_RANK.advanced
      ? ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"]
      : ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

  const envExtras =
    process.env.GEMINI_MODEL_FALLBACKS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  const chain = [...new Set([...byPlan, ...envExtras, DEFAULT_GEMINI_MODEL])];
  return chain.length ? chain : [DEFAULT_GEMINI_MODEL];
}
