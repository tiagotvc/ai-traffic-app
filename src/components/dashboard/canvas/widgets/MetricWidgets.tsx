"use client";

import { useTranslations } from "next-intl";

import { DashboardPerformanceChart } from "@/components/dashboard/DashboardPerformanceChart";
import { METRIC_BY_KEY, type MetricKey } from "@/lib/dashboard-metrics";
import { pctDelta } from "@/lib/dashboard-ranges";
import { toChartData } from "@/uxpilot-ui/adapters/dashboard-mappers";
import type { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";

type DashboardData = ReturnType<typeof useDashboardData>;

export function SingleMetricWidget({
  data,
  metricKey
}: {
  data: DashboardData;
  metricKey: MetricKey;
}) {
  const tMetrics = useTranslations("metrics");
  const summary = data.summary ?? {};
  const prev = data.prevSummary;
  const value = summary[metricKey] ?? 0;
  const delta = prev?.[metricKey] != null && prev[metricKey]! > 0 ? pctDelta(value, prev[metricKey]!) : null;
  const meta = METRIC_BY_KEY[metricKey];

  return (
    <div className="flex h-full flex-col justify-center gap-1">
      <p className="text-xs font-medium" style={{ color: "var(--text-dim)" }}>
        {tMetrics(meta.label)}
      </p>
      <p className="font-heading text-2xl font-bold" style={{ color: meta.color }}>
        {data.formatMetricValue(metricKey, value)}
      </p>
      {delta != null ? (
        <p className="text-xs" style={{ color: delta >= 0 ? "#22c55e" : "#ef4444" }}>
          {delta >= 0 ? "+" : ""}
          {delta.toFixed(1)}% {data.vsLabel}
        </p>
      ) : null}
    </div>
  );
}

export function DualMetricChartWidget({
  data,
  metricA,
  metricB
}: {
  data: DashboardData;
  metricA: MetricKey;
  metricB: MetricKey;
}) {
  const metrics = [metricA, metricB];
  return (
    <DashboardPerformanceChart
      data={toChartData(data.series, data.locale)}
      activeMetrics={metrics}
      onToggleMetric={() => {}}
      formatValue={data.formatMetricValue}
      metricLabels={data.chartMetricLabels}
      isLoading={data.loading}
      subtitle={data.vsLabel}
    />
  );
}
