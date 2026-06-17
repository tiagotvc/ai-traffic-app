import { presetMetricsFor } from "@/lib/campaign-presets";
import type { MetricKey } from "@/lib/dashboard-metrics";
import type { TableColumnRef } from "@/lib/campaign-table-layout";

export function metricKeysToColumns(keys: MetricKey[]): TableColumnRef[] {
  return keys.map((key) => ({ kind: "metric", key }));
}

/** Colunas de métricas para um tipo de campanha (built-in ou personalizado). */
export function metricsColumnsForPreset(
  preset: string,
  customTypes: Map<string, { metrics: string[] }>
): TableColumnRef[] {
  return metricKeysToColumns(presetMetricsFor(preset, customTypes));
}

export function customTypesToMap(
  types: Array<{ id: string; metrics: string[] }>
): Map<string, { metrics: string[] }>
{
  const m = new Map<string, { metrics: string[] }>();
  for (const t of types) m.set(t.id, { metrics: t.metrics });
  return m;
}

export function metricKeysFromColumns(columns: TableColumnRef[]): MetricKey[] {
  return columns
    .filter((c): c is { kind: "metric"; key: MetricKey } => c.kind === "metric")
    .map((c) => c.key);
}
