import type { MetricKey } from "@/lib/dashboard-metrics";
import { MAX_CANVAS_CHART_METRICS } from "@/lib/dashboard-metrics";

export type ChartBarLayout = "vertical" | "horizontal";

export function toggleChartMetricSelection(
  current: MetricKey[],
  key: MetricKey,
  max = MAX_CANVAS_CHART_METRICS
): MetricKey[] {
  if (current.includes(key)) {
    return current.length > 1 ? current.filter((k) => k !== key) : current;
  }
  if (current.length >= max) return current;
  return [...current, key];
}

export function normalizeChartMetrics(
  value: unknown,
  fallback: MetricKey[] = ["spend", "conversions"]
): MetricKey[] {
  if (!Array.isArray(value) || !value.length) return fallback;
  const unique = [...new Set(value.filter((v) => typeof v === "string"))] as MetricKey[];
  return unique.slice(0, MAX_CANVAS_CHART_METRICS);
}
