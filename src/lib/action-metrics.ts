import type { MetaInsightRow } from "@/lib/meta-graph";

export function buildActionMetrics(
  actions?: Array<{ action_type: string; value: string }>
): Record<string, number> {
  const out: Record<string, number> = {};
  if (!actions?.length) return out;
  for (const a of actions) {
    const n = Number(a.value);
    if (!Number.isFinite(n)) continue;
    out[a.action_type] = (out[a.action_type] ?? 0) + n;
  }
  return out;
}

export function mergeActionMetrics(
  ...maps: Array<Record<string, number> | undefined>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of maps) {
    if (!m) continue;
    for (const [k, v] of Object.entries(m)) {
      out[k] = (out[k] ?? 0) + v;
    }
  }
  return out;
}

export type WithActionMetrics<T> = T & { actionMetrics?: Record<string, number> };

export function attachActionMetricsFromInsight<T extends object>(
  row: T,
  insight?: Pick<MetaInsightRow, "actions"> | null
): WithActionMetrics<T> {
  return {
    ...row,
    actionMetrics: buildActionMetrics(insight?.actions)
  };
}
