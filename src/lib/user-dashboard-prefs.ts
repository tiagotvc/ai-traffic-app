import "server-only";

import { repositories } from "@/db/repositories";
import {
  DEFAULT_DASHBOARD_CHART_METRICS,
  DEFAULT_DASHBOARD_CLIENT_METRIC,
  MAX_CHART_METRICS,
  METRIC_BY_KEY,
  type MetricKey
} from "@/lib/dashboard-metrics";

export { DEFAULT_DASHBOARD_CHART_METRICS, DEFAULT_DASHBOARD_CLIENT_METRIC };

export function normalizeDashboardChartMetrics(raw: unknown): MetricKey[] {
  if (!Array.isArray(raw)) return [...DEFAULT_DASHBOARD_CHART_METRICS];
  const valid = raw.filter(
    (k): k is MetricKey => typeof k === "string" && k in METRIC_BY_KEY
  );
  const unique = [...new Set(valid)].slice(0, MAX_CHART_METRICS);
  return unique.length ? unique : [...DEFAULT_DASHBOARD_CHART_METRICS];
}

export function normalizeDashboardClientMetric(raw: unknown): MetricKey {
  if (typeof raw === "string" && raw in METRIC_BY_KEY) return raw as MetricKey;
  return DEFAULT_DASHBOARD_CLIENT_METRIC;
}

export async function getUserDashboardChartMetrics(
  tenantId: string,
  userId: string
): Promise<MetricKey[]> {
  const { tenantMember: repo } = await repositories();
  const row = await repo.findOne({ where: { tenantId, userId } });
  return normalizeDashboardChartMetrics(row?.dashboardChartMetrics);
}

export async function getUserDashboardClientMetric(
  tenantId: string,
  userId: string
): Promise<MetricKey> {
  const { tenantMember: repo } = await repositories();
  const row = await repo.findOne({ where: { tenantId, userId } });
  return normalizeDashboardClientMetric(row?.dashboardClientMetric);
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

export async function saveUserDashboardClientMetric(
  tenantId: string,
  userId: string,
  metric: MetricKey
): Promise<MetricKey> {
  const normalized = normalizeDashboardClientMetric(metric);
  const { tenantMember: repo } = await repositories();
  let row = await repo.findOne({ where: { tenantId, userId } });
  if (!row) {
    row = repo.create({
      tenantId,
      userId,
      role: "member",
      dashboardClientMetric: normalized
    });
  } else {
    row.dashboardClientMetric = normalized;
  }
  await repo.save(row);
  return normalized;
}
