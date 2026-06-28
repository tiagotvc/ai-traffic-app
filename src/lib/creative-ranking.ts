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
 * Volume mínimo de RESULTADO para o criativo entrar nos "melhores" (e não no
 * topo só por ter custo baixo com 1-2 resultados). Abaixo disso -> "promissores".
 */
const MIN_VOLUME: Record<string, { metric: MetricKey; min: number }> = {
  sales: { metric: "conversions", min: 3 },
  lead_whatsapp: { metric: "messages", min: 10 },
  lead_site: { metric: "conversions", min: 5 },
  reach: { metric: "impressions", min: 1000 },
  default: { metric: "clicks", min: 20 }
};

/** Métricas de resultado cuja volumetria mínima escala com o tamanho do período. */
const PERIOD_SCALED_RESULT_METRICS = new Set<MetricKey>(["conversions", "messages"]);

export type BestVolumeOptions = {
  /** Dias inclusivos do período analisado (ajusta mínimo de conversões/mensagens). */
  periodDays?: number | null;
};

/** Até 7 dias: 5 resultados; períodos maiores: 10. */
export function minResultVolumeForPeriod(periodDays: number): number {
  return periodDays <= 7 ? 5 : 10;
}

function resolveMinVolume(
  preset: string | undefined,
  periodDays?: number | null
): { metric: MetricKey; min: number } {
  const base = MIN_VOLUME[preset ?? "default"] ?? MIN_VOLUME.default;
  if (
    periodDays != null &&
    periodDays > 0 &&
    PERIOD_SCALED_RESULT_METRICS.has(base.metric)
  ) {
    return { metric: base.metric, min: minResultVolumeForPeriod(periodDays) };
  }
  return base;
}

export function bestEligible(
  m: Partial<Record<MetricKey, number>>,
  preset?: string,
  opts?: BestVolumeOptions
): boolean {
  const v = resolveMinVolume(preset, opts?.periodDays);
  return Number(m[v.metric] ?? 0) >= v.min;
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

/** Typical sort direction per metric — UX hints only; does not alter ranking. */
export const METRIC_DEFAULT_DIR: Partial<Record<MetricKey, "asc" | "desc">> = {
  roas: "desc",
  conversions: "desc",
  messages: "desc",
  ctr: "desc",
  reach: "desc",
  impressions: "desc",
  clicks: "desc",
  cpa: "asc",
  cpmsg: "asc",
  cpc: "asc",
  cpm: "asc",
  spend: "asc",
  frequency: "asc"
};

export function isUnusualRankDirection(metric: MetricKey, dir: "asc" | "desc"): boolean {
  const typical = METRIC_DEFAULT_DIR[metric];
  return typical != null && typical !== dir;
}

export function metricUsesLowerIsBetter(metric: MetricKey): boolean {
  return METRIC_DEFAULT_DIR[metric] === "asc";
}
