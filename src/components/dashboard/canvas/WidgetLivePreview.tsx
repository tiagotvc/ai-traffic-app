"use client";

import { useTranslations } from "next-intl";

import {
  AgencyHealthWidget,
  AlertsFeedWidget,
  PerformanceChartWidget
} from "@/components/dashboard/canvas/widgets/LegacyWidgets";
import {
  AiCorrelationWidget,
  HeatmapWidget,
  ScatterWidget
} from "@/components/dashboard/canvas/widgets/PremiumWidgets";
import { TaskbarWidget } from "@/components/dashboard/canvas/widgets/TaskbarWidget";
import { DualMetricChartWidget, SingleMetricWidget } from "@/components/dashboard/canvas/widgets/MetricWidgets";
import { WidgetConfigPreview } from "@/components/dashboard/canvas/WidgetConfigPreview";
import { normalizeChartMetrics } from "@/lib/dashboard/chart-metrics";
import type { ChartBarLayout } from "@/lib/dashboard/chart-metrics";
import {
  resolveMetricKeyFromWidget,
  type AlertsDensity,
  type ChartStyle,
  type ClientsHealthView,
  type MetricCardStyle
} from "@/lib/dashboard/widget-config";
import { normalizeTaskbarSlots, type TaskbarOrientation } from "@/lib/dashboard/taskbar-config";
import { getWidgetDefinition } from "@/lib/dashboard/widget-catalog";
import type { MetricKey } from "@/lib/dashboard-metrics";
import type { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";

type DashboardData = ReturnType<typeof useDashboardData>;

export function WidgetLivePreview({
  widgetType,
  titleKey,
  config,
  dashboardData,
  previewHeight
}: {
  widgetType: string;
  titleKey?: string;
  config: Record<string, unknown>;
  dashboardData?: DashboardData;
  previewHeight?: number;
}) {
  const t = useTranslations("dashboardWidgets");

  if (!dashboardData) {
    return <WidgetConfigPreview widgetType={widgetType} config={config} />;
  }

  if (widgetType === "layout.taskbar" || widgetType === "premium.metricMatrix") {
    const orientation = (config.orientation as TaskbarOrientation | undefined) ?? "horizontal";
    const slots = normalizeTaskbarSlots(config.slots);
    return (
      <TaskbarWidget
        data={dashboardData}
        orientation={orientation}
        slots={slots}
        preview
      />
    );
  }

  if (widgetType === "chart.performance") {
    const chartMetrics = normalizeChartMetrics(config.chartMetrics);
    const chartStyle = (config.chartStyle as ChartStyle | undefined) ?? "area";
    const barLayout = (config.barLayout as ChartBarLayout | undefined) ?? "vertical";
    return (
      <div style={{ height: previewHeight ?? 200 }}>
        <PerformanceChartWidget
          data={dashboardData}
          chartMetrics={chartMetrics}
          chartStyle={chartStyle}
          barLayout={barLayout}
        />
      </div>
    );
  }

  if (widgetType === "chart.compare") {
    const metricA = (config.metricA as MetricKey | undefined) ?? "spend";
    const metricB = (config.metricB as MetricKey | undefined) ?? "roas";
    const chartStyle = (config.chartStyle as ChartStyle | undefined) ?? "area";
    const barLayout = (config.barLayout as ChartBarLayout | undefined) ?? "vertical";
    return (
      <div style={{ height: previewHeight ?? 200 }}>
        <DualMetricChartWidget
          data={dashboardData}
          metricA={metricA}
          metricB={metricB}
          chartStyle={chartStyle}
          barLayout={barLayout}
        />
      </div>
    );
  }

  const def = getWidgetDefinition(widgetType);
  if (def?.component === "DualMetricChartWidget") {
    const defaults = def.defaultConfig ?? {};
    const metricA = (config.metricA as MetricKey | undefined) ?? (defaults.metricA as MetricKey) ?? "roas";
    const metricB = (config.metricB as MetricKey | undefined) ?? (defaults.metricB as MetricKey) ?? "cpa";
    const chartStyle = (config.chartStyle as ChartStyle | undefined) ?? (defaults.chartStyle as ChartStyle) ?? "area";
    const barLayout = (config.barLayout as ChartBarLayout | undefined) ?? "vertical";
    return (
      <div style={{ height: previewHeight ?? 200 }}>
        <DualMetricChartWidget
          data={dashboardData}
          metricA={metricA}
          metricB={metricB}
          chartStyle={chartStyle}
          barLayout={barLayout}
        />
      </div>
    );
  }

  if (widgetType === "metrics.card" || widgetType.startsWith("metric.single.")) {
    const metricKey = resolveMetricKeyFromWidget(widgetType, config);
    const cardStyle = (config.cardStyle as MetricCardStyle | undefined) ?? "centered";
    return (
      <div
        className="mx-auto w-full"
        style={{
          maxWidth: cardStyle === "compact" ? 280 : 360,
          height: previewHeight ?? (cardStyle === "compact" ? 72 : 140)
        }}
      >
        <SingleMetricWidget data={dashboardData} metricKey={metricKey} cardStyle={cardStyle} />
      </div>
    );
  }

  if (widgetType === "alerts.feed") {
    const density = (config.density as AlertsDensity | undefined) ?? "stacked";
    return (
      <div style={{ height: previewHeight ?? 180, overflow: "auto" }}>
        <AlertsFeedWidget data={dashboardData} density={density} />
      </div>
    );
  }

  if (widgetType === "clients.health") {
    const view = (config.view as ClientsHealthView | undefined) ?? "full";
    return (
      <div style={{ height: previewHeight ?? 220, overflow: "auto" }}>
        <AgencyHealthWidget data={dashboardData} view={view} />
      </div>
    );
  }

  if (widgetType === "advanced.scatter") {
    return (
      <div style={{ height: previewHeight ?? 180 }}>
        <ScatterWidget
          data={dashboardData}
          metricX={(config.metricX as MetricKey) ?? "spend"}
          metricY={(config.metricY as MetricKey) ?? "roas"}
          pointSize={(config.pointSize as "small" | "medium" | "large") ?? "medium"}
        />
      </div>
    );
  }

  if (widgetType === "advanced.heatmap") {
    return (
      <div style={{ height: previewHeight ?? 140 }}>
        <HeatmapWidget
          data={dashboardData}
          heatmapMetric={(config.heatmapMetric as MetricKey) ?? "spend"}
        />
      </div>
    );
  }

  if (widgetType === "ai.correlation") {
    return (
      <div style={{ height: previewHeight ?? 140 }}>
        <AiCorrelationWidget
          data={dashboardData}
          metricA={(config.metricA as MetricKey) ?? "spend"}
          metricB={(config.metricB as MetricKey) ?? "conversions"}
        />
      </div>
    );
  }

  if (widgetType === "premium.multiChart") {
    const chartMetrics = normalizeChartMetrics(config.chartMetrics);
    const chartStyle = (config.chartStyle as ChartStyle | undefined) ?? "area";
    const barLayout = (config.barLayout as ChartBarLayout | undefined) ?? "vertical";
    return (
      <div style={{ height: previewHeight ?? 220 }}>
        <PerformanceChartWidget
          data={dashboardData}
          chartMetrics={chartMetrics}
          chartStyle={chartStyle}
          barLayout={barLayout}
        />
      </div>
    );
  }

  if (titleKey) {
    return (
      <div
        className="flex h-full items-center justify-center rounded-lg border border-dashed text-xs"
        style={{ borderColor: "var(--border-color)", color: "var(--text-dim)", minHeight: previewHeight ?? 120 }}
      >
        {t(titleKey)}
      </div>
    );
  }

  return (
    <div className="skeleton-shimmer rounded-lg" style={{ minHeight: previewHeight ?? 120 }} />
  );
}
