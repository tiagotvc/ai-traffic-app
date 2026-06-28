import { formatBRL, formatNumber, formatPercent, formatRoas } from "@/lib/format";

export type MetricKey =
  | "spend"
  | "impressions"
  | "reach"
  | "frequency"
  | "clicks"
  | "ctr"
  | "cpc"
  | "cpm"
  | "conversions"
  | "cpa"
  | "messages"
  | "cpmsg"
  | "roas";

type MetricFormat = "currency" | "number" | "percent" | "ratio" | "multiplier";

export type MetricDef = {
  key: MetricKey;
  /** chave i18n no namespace "metrics" */
  label: MetricKey;
  format: MetricFormat;
  category: MetricCategory;
  color: string;
};

export type MetricCategory = "performance" | "results" | "costs";

export const METRIC_CATALOG: MetricDef[] = [
  { key: "reach", label: "reach", format: "number", category: "performance", color: "#0ea5e9" },
  { key: "impressions", label: "impressions", format: "number", category: "performance", color: "#6366f1" },
  { key: "frequency", label: "frequency", format: "ratio", category: "performance", color: "#8b5cf6" },
  { key: "clicks", label: "clicks", format: "number", category: "performance", color: "#14b8a6" },
  { key: "ctr", label: "ctr", format: "percent", category: "performance", color: "#f59e0b" },
  { key: "conversions", label: "conversions", format: "number", category: "results", color: "#10b981" },
  { key: "messages", label: "messages", format: "number", category: "results", color: "#ec4899" },
  { key: "roas", label: "roas", format: "multiplier", category: "results", color: "#22c55e" },
  { key: "cpmsg", label: "cpmsg", format: "currency", category: "costs", color: "#db2777" },
  { key: "spend", label: "spend", format: "currency", category: "costs", color: "#7c3aed" },
  { key: "cpc", label: "cpc", format: "currency", category: "costs", color: "#ef4444" },
  { key: "cpm", label: "cpm", format: "currency", category: "costs", color: "#f97316" },
  { key: "cpa", label: "cpa", format: "currency", category: "costs", color: "#e11d48" }
];

export const METRIC_CATEGORIES: MetricCategory[] = ["performance", "results", "costs"];

export const METRIC_BY_KEY: Record<MetricKey, MetricDef> = Object.fromEntries(
  METRIC_CATALOG.map((m) => [m.key, m])
) as Record<MetricKey, MetricDef>;

/** Métricas exibidas como chips de acesso rápido (acima do gráfico). */
export const QUICK_METRICS: MetricKey[] = [
  "spend",
  "impressions",
  "reach",
  "clicks",
  "ctr",
  "conversions",
  "messages",
  "roas"
];

export const MAX_CHART_METRICS = 3;

/** Limite de métricas por widget de gráfico no canvas (independente das prefs V2). */
export const MAX_CANVAS_CHART_METRICS = 6;

export const DEFAULT_DASHBOARD_CHART_METRICS: MetricKey[] = ["spend", "roas", "clicks"];

export const DEFAULT_DASHBOARD_CLIENT_METRIC: MetricKey = "roas";

export function formatMetricValue(key: MetricKey, value: number, locale?: string): string {
  const def = METRIC_BY_KEY[key];
  const v = Number.isFinite(value) ? value : 0;
  switch (def.format) {
    case "currency":
      return formatBRL(v, locale);
    case "percent":
      return formatPercent(v, 2, locale);
    case "multiplier":
      return formatRoas(v, locale);
    case "ratio":
      return v.toLocaleString(locale === "en" ? "en-US" : "pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    case "number":
    default:
      return formatNumber(Math.round(v), locale);
  }
}
