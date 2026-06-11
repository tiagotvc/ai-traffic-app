import type { MetricKey } from "@/lib/dashboard-metrics";

export type RankSpec = { metric: MetricKey; dir: "asc" | "desc" };

/**
 * Métrica de EFICIÊNCIA usada para ranquear os melhores criativos por tipo.
 * dir "asc" = menor é melhor (custos); "desc" = maior é melhor.
 */
const RANK_SPEC: Record<string, RankSpec> = {
  sales: { metric: "roas", dir: "desc" },
  lead_whatsapp: { metric: "cpmsg", dir: "asc" },
  lead_site: { metric: "cpa", dir: "asc" },
  reach: { metric: "cpm", dir: "asc" },
  default: { metric: "ctr", dir: "desc" }
};

export function rankSpecFor(preset?: string): RankSpec {
  return RANK_SPEC[preset ?? "default"] ?? RANK_SPEC.default;
}

/** Piso mínimo de atividade para um criativo entrar no ranking. */
export const MIN_RANK_IMPRESSIONS = 100;

export function meetsMinActivity(m: Partial<Record<MetricKey, number>>): boolean {
  return Number(m.impressions ?? 0) >= MIN_RANK_IMPRESSIONS;
}

/**
 * Valor de ordenação. Para métricas de custo (dir asc), 0/indefinido vira
 * "pior" (Infinity) — senão um criativo sem resultado ranquearia como o mais barato.
 */
export function rankValue(m: Partial<Record<MetricKey, number>>, spec: RankSpec): number {
  const v = Number(m[spec.metric] ?? 0);
  if (spec.dir === "asc") return v > 0 ? v : Number.POSITIVE_INFINITY;
  return v;
}

export function compareByRank(
  a: Partial<Record<MetricKey, number>>,
  b: Partial<Record<MetricKey, number>>,
  spec: RankSpec
): number {
  const va = rankValue(a, spec);
  const vb = rankValue(b, spec);
  return spec.dir === "asc" ? va - vb : vb - va;
}
