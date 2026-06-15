import "server-only";

import { repositories } from "@/db/repositories";
import {
  DEFAULT_DASHBOARD_CHART_METRICS,
  MAX_CHART_METRICS,
  METRIC_BY_KEY,
  type MetricKey
} from "@/lib/dashboard-metrics";

export { DEFAULT_DASHBOARD_CHART_METRICS };

export function normalizeDashboardChartMetrics(raw: unknown): MetricKey[] {
  if (!Array.isArray(raw)) return [...DEFAULT_DASHBOARD_CHART_METRICS];
  const valid = raw.filter(
    (k): k is MetricKey => typeof k === "string" && k in METRIC_BY_KEY
  );
  const unique = [...new Set(valid)].slice(0, MAX_CHART_METRICS);
  return unique.length ? unique : [...DEFAULT_DASHBOARD_CHART_METRICS];
}

export async function getUserDashboardChartMetrics(
  tenantId: string,
  userId: string
): Promise<MetricKey[]> {
  const { tenantMember: repo } = await repositories();
  const row = await repo.findOne({ where: { tenantId, userId } });
  return normalizeDashboardChartMetrics(row?.dashboardChartMetrics);
}

export async function saveUserDashboardChartMetrics(
  tenantId: string,
  userId: string,
  metrics: MetricKey[]
): Promise<MetricKey[]> {
  const normalized = normalizeDashboardChartMetrics(metrics);
  const { tenantMember: repo } = await repositories();
  let row = await repo.findOne({ where: { tenantId, userId } });
  if (!row) {
    row = repo.create({
      tenantId,
      userId,
      role: "member",
      dashboardChartMetrics: normalized
    });
  } else {
    row.dashboardChartMetrics = normalized;
  }
  await repo.save(row);
  return normalized;
}
