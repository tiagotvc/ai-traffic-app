"use client";

import { DashboardPerformanceChart } from "@/components/dashboard/DashboardPerformanceChart";
import {
  AlertsFeedWidget
} from "@/components/dashboard/canvas/widgets/LegacyWidgets";
import { SingleMetricWidget } from "@/components/dashboard/canvas/widgets/MetricWidgets";
import { normalizeChartMetrics } from "@/lib/dashboard/chart-metrics";
import type { ChartBarLayout } from "@/lib/dashboard/chart-metrics";
import {
  parseExtendedChartStyle,
  parseSlotVisualConfig
} from "@/lib/dashboard/slot-visual-config";
import {
  resolveMetricKeyFromWidget,
  type AlertsDensity,
  type MetricCardStyle
} from "@/lib/dashboard/widget-config";
import { slotKindFromWidgetType, type TaskbarSlot } from "@/lib/dashboard/taskbar-config";
import type { MetricKey } from "@/lib/dashboard-metrics";
import { toChartData } from "@/uxpilot-ui/adapters/dashboard-mappers";
import type { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";

type DashboardData = ReturnType<typeof useDashboardData>;

export function CompositeSlotContent({
  slot,
  data,
  compact
}: {
  slot: TaskbarSlot;
  data: DashboardData;
  compact: boolean;
}) {
  const kind = slotKindFromWidgetType(slot.widgetType);
  const visual = parseSlotVisualConfig(slot.config);

  if (kind === "alerts") {
    const density = (slot.config.density as AlertsDensity | undefined) ?? (compact ? "inline" : "stacked");
    return (
      <div className="h-full min-h-0 overflow-hidden">
        <AlertsFeedWidget data={data} density={density} />
      </div>
    );
  }

  if (kind === "chart") {
    const chartMetrics = normalizeChartMetrics(slot.config.chartMetrics, ["spend", "roas"]);
    const chartStyle = parseExtendedChartStyle(slot.config.chartStyle);
    const barLayout = (slot.config.barLayout as ChartBarLayout | undefined) ?? "vertical";
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <DashboardPerformanceChart
          data={toChartData(data.series, data.locale)}
          activeMetrics={chartMetrics}
          formatValue={data.formatMetricValue}
          metricLabels={data.chartMetricLabels}
          isLoading={data.loading}
          variant="embedded"
          chartStyle={chartStyle}
          barLayout={barLayout}
          disableToggle
          visual={visual}
        />
      </div>
    );
  }

  const metricKey = resolveMetricKeyFromWidget(slot.widgetType, slot.config);
  const cardStyle =
    (slot.config.cardStyle as MetricCardStyle | undefined) ?? (compact ? "compact" : "centered");
  return (
    <SingleMetricWidget
      data={data}
      metricKey={metricKey}
      cardStyle={cardStyle}
      visual={visual}
    />
  );
}

export function updateTaskbarSlotMetric(
  slots: TaskbarSlot[],
  slotId: string,
  metricKey: MetricKey,
  compact: boolean
): TaskbarSlot[] {
  return slots.map((s) =>
    s.id === slotId
      ? {
          ...s,
          widgetType: "metrics.card",
          config: { ...s.config, metricKey, cardStyle: compact ? "compact" : "centered" }
        }
      : s
  );
}

export function updateTaskbarSlotChartMetrics(
  slots: TaskbarSlot[],
  slotId: string,
  chartMetrics: MetricKey[]
): TaskbarSlot[] {
  return slots.map((s) =>
    s.id === slotId ? { ...s, config: { ...s.config, chartMetrics } } : s
  );
}
