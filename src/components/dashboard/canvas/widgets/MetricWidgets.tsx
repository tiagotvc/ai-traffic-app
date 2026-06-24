"use client";

import { useTranslations } from "next-intl";

import { MetricKpiCard } from "@/components/dashboard/MetricPrism";
import { DashboardPerformanceChart } from "@/components/dashboard/DashboardPerformanceChart";
import { CanvasMetricStrip } from "@/components/dashboard/canvas/widgets/CanvasMetricStrip";
import type { ChartStyle, MetricCardStyle } from "@/lib/dashboard/widget-config";
import type { ChartBarLayout } from "@/lib/dashboard/chart-metrics";
import type { ExtendedChartStyle, SlotVisualConfig } from "@/lib/dashboard/slot-visual-config";
import { METRIC_BY_KEY, type MetricKey } from "@/lib/dashboard-metrics";
import { pctDelta } from "@/lib/dashboard-ranges";
import { toChartData, toMetricPrismProps } from "@/uxpilot-ui/adapters/dashboard-mappers";
import type { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";

type DashboardData = ReturnType<typeof useDashboardData>;

export function SingleMetricWidget({
  data,
  metricKey,
  cardStyle = "centered",
  visual
}: {
  data: DashboardData;
  metricKey: MetricKey;
  cardStyle?: MetricCardStyle;
  visual?: SlotVisualConfig;
}) {
  const tMetrics = useTranslations("metrics");
  const compact = cardStyle === "compact";

  if (!compact) {
    const { primaryKPIs } = toMetricPrismProps({
      summary: data.summary ?? {},
      prevSummary: data.prevSummary,
      series: data.series,
      heroMetrics: [metricKey],
      locale: data.locale,
      metricLabel: data.metricLabel,
      vsLabel: data.vsLabel
    });
    const kpi = primaryKPIs[0];
    if (!kpi && !data.loading) return null;
    return (
      <div className="h-full min-h-0 w-full max-lg:h-auto">
        {kpi ? <MetricKpiCard kpi={kpi} isLoading={data.loading} /> : null}
      </div>
    );
  }

  const summary = data.summary ?? {};
  const prev = data.prevSummary;
  const value = summary[metricKey] ?? 0;
  const delta =
    prev?.[metricKey] != null && prev[metricKey]! > 0 ? pctDelta(value, prev[metricKey]!) : null;
  const meta = METRIC_BY_KEY[metricKey];

  if (data.loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="skeleton-shimmer h-8 w-20 rounded-lg" />
      </div>
    );
  }

  const deltaMeta =
    delta == null
      ? { change: "—" as const, trend: "neutral" as const }
      : {
          change: `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`,
          trend: (delta >= 0 ? "up" : "down") as "up" | "down"
        };

  return (
    <div className="flex h-full min-h-0 w-full">
      <CanvasMetricStrip
        cellFill
        items={[
          {
            label: tMetrics(meta.label),
            value: data.formatMetricValue(metricKey, value),
            change: deltaMeta.change,
            trend: deltaMeta.trend,
            color: meta.color
          }
        ]}
        visual={visual}
      />
    </div>
  );
}

export function DualMetricChartWidget({
  data,
  metricA,
  metricB,
  chartStyle = "area",
  barLayout = "vertical",
  visual
}: {
  data: DashboardData;
  metricA: MetricKey;
  metricB: MetricKey;
  chartStyle?: ChartStyle | ExtendedChartStyle;
  barLayout?: ChartBarLayout;
  visual?: SlotVisualConfig;
}) {
  const metrics = [metricA, metricB];
  return (
    <DashboardPerformanceChart
      data={toChartData(data.series, data.locale)}
      activeMetrics={metrics}
      formatValue={data.formatMetricValue}
      metricLabels={data.chartMetricLabels}
      isLoading={data.loading}
      subtitle={data.vsLabel}
      variant="canvas"
      chartStyle={chartStyle}
      barLayout={barLayout}
      disableToggle
      visual={visual}
    />
  );
}
