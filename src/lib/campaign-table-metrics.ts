import { presetMetricsFor } from "@/lib/campaign-presets";
import type { MetricKey } from "@/lib/dashboard-metrics";
import {
  columnRefKey,
  DEFAULT_CAMPAIGN_TABLE_LAYOUT,
  DEFAULT_LAYOUT_ID,
  layoutMetricColumns,
  type CampaignTableLayout,
  type TableColumnRef
} from "@/lib/campaign-table-layout";

export function metricKeysToColumns(keys: MetricKey[]): TableColumnRef[] {
  return keys.map((key) => ({ kind: "metric", key }));
}

function defaultMetricColumns(): TableColumnRef[] {
  return layoutMetricColumns(DEFAULT_CAMPAIGN_TABLE_LAYOUT);
}

/** Visão personalizada salva pelo usuário (engrenagem), não o padrão do sistema. */
export function usesCustomMetricLayout(layout: CampaignTableLayout): boolean {
  if (layout.id !== DEFAULT_LAYOUT_ID && layout.id !== "migrated-local") return true;
  const user = layoutMetricColumns(layout);
  if (!user.length) return false;
  const def = defaultMetricColumns();
  if (user.length !== def.length) return true;
  return user.some((col, i) => columnRefKey(col) !== columnRefKey(def[i]!));
}

/**
 * Métricas da tabela: por padrão seguem o tipo da campanha (Geral, Lead site, etc.).
 * Se o usuário salvou uma visão customizada na engrenagem, usa essa visão.
 */
export function effectiveMetricColumnsForPreset(
  preset: string,
  customTypes: Map<string, { metrics: string[] }>,
  userLayout: CampaignTableLayout
): TableColumnRef[] {
  const userMetrics = layoutMetricColumns(userLayout);
  if (usesCustomMetricLayout(userLayout) && userMetrics.length > 0) {
    return userMetrics;
  }
  return metricKeysToColumns(presetMetricsFor(preset, customTypes));
}

export function customTypesToMap(
  types: Array<{ id: string; metrics: string[] }>
): Map<string, { metrics: string[] }> {
  const m = new Map<string, { metrics: string[] }>();
  for (const t of types) m.set(t.id, { metrics: t.metrics });
  return m;
}
