import type { MetricKey } from "@/lib/dashboard-metrics";

export type RankSpec = { metric: MetricKey; dir: "asc" | "desc" };

export type RankConfig = {
  minImpressions: number;
  specs: Record<string, RankSpec>;
};

/** Tipos de campanha configuráveis (na ordem exibida na UI). */
export const RANKABLE_PRESETS = ["sales", "lead_whatsapp", "lead_site", "reach", "default"] as const;

/** Métricas que podem ser escolhidas como critério de ranqueamento. */
export const RANKABLE_METRICS: MetricKey[] = [
  "roas",
  "conversions",
  "cpa",
  "messages",
  "cpmsg",
  "ctr",
  "cpc",
  "cpm",
  "reach",
  "impressions",
  "spend",
  "frequency"
];

/**
 * Default: ranqueia por EFICIÊNCIA por tipo de campanha.
 * dir "asc" = menor é melhor (custos); "desc" = maior é melhor.
 */
export const DEFAULT_RANK_CONFIG: RankConfig = {
  minImpressions: 100,
  specs: {
    sales: { metric: "roas", dir: "desc" },
    lead_whatsapp: { metric: "cpmsg", dir: "asc" },
    lead_site: { metric: "cpa", dir: "asc" },
    reach: { metric: "cpm", dir: "asc" },
    default: { metric: "ctr", dir: "desc" }
  }
};

export function rankSpecFor(preset?: string, config: RankConfig = DEFAULT_RANK_CONFIG): RankSpec {
  return (
    config.specs[preset ?? "default"] ??
    config.specs.default ??
    DEFAULT_RANK_CONFIG.specs.default
  );
}

export function meetsMinActivity(
  m: Partial<Record<MetricKey, number>>,
  config: RankConfig = DEFAULT_RANK_CONFIG
): boolean {
  return Number(m.impressions ?? 0) >= config.minImpressions;
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
