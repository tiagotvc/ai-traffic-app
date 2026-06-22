"use client";

import { useTranslations } from "next-intl";

import {
  AccountHealthWidget,
  AgencyBrainWidget,
  RecentLearningsWidget
} from "@/components/dashboard/canvas/widgets/AiWidgets";
import {
  AgencyHealthWidget,
  AlertsFeedWidget,
  BrainLearningsWidget,
  HeroKpisWidget,
  PerformanceChartWidget,
  QuickPillsWidget
} from "@/components/dashboard/canvas/widgets/LegacyWidgets";
import {
  AiCorrelationWidget,
  BoxPlotWidget,
  BulletWidget,
  HeatmapWidget,
  ParetoWidget,
  RadarStandaloneWidget,
  ScatterWidget
} from "@/components/dashboard/canvas/widgets/PremiumWidgets";
import { TaskbarWidget } from "@/components/dashboard/canvas/widgets/TaskbarWidget";
import { DualMetricChartWidget, SingleMetricWidget } from "@/components/dashboard/canvas/widgets/MetricWidgets";
import {
  resolveMetricKeyFromWidget,
  type AlertsDensity,
  type ClientsHealthView,
  type MetricCardStyle
} from "@/lib/dashboard/widget-config";
import { parseExtendedChartStyle, parseSlotVisualConfig } from "@/lib/dashboard/slot-visual-config";
import { normalizeChartMetrics } from "@/lib/dashboard/chart-metrics";
import type { ChartBarLayout } from "@/lib/dashboard/chart-metrics";
import { normalizeTaskbarSlots, type TaskbarOrientation } from "@/lib/dashboard/taskbar-config";
import { parseWidgetPeriod } from "@/lib/dashboard/widget-period";
import { getWidgetDefinition, type WidgetInstanceDto } from "@/lib/dashboard/widget-catalog";
import type { MetricKey } from "@/lib/dashboard-metrics";
import { toBrainShelfLearnings } from "@/uxpilot-ui/adapters/dashboard-mappers";
import { useWidgetScopedDashboardData } from "@/uxpilot-ui/adapters/useWidgetScopedDashboardData";
import type { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";

type DashboardData = ReturnType<typeof useDashboardData>;

export function WidgetRenderer({
  instance,
  dashboardData,
  onWidgetConfigChange
}: {
  instance: WidgetInstanceDto;
  dashboardData: DashboardData;
  onWidgetConfigChange?: (widgetId: string, config: Record<string, unknown>) => void;
}) {
  const periodPreset = parseWidgetPeriod(instance.config);
  const scopedData = useWidgetScopedDashboardData(dashboardData, periodPreset);

  return (
    <WidgetRendererBody
      instance={instance}
      dashboardData={scopedData}
      onWidgetConfigChange={onWidgetConfigChange}
    />
  );
}

function WidgetRendererBody({
  instance,
  dashboardData,
  onWidgetConfigChange
}: {
  instance: WidgetInstanceDto;
  dashboardData: DashboardData;
  onWidgetConfigChange?: (widgetId: string, config: Record<string, unknown>) => void;
}) {
  const t = useTranslations("dashboardWidgets");
  const type = instance.widgetType;

  if (type === "brain.learnings") {
    return <BrainLearningsWidget data={dashboardData} />;
  }
  if (type === "metrics.heroKpis") {
    const heroMetrics = instance.config.heroMetrics as MetricKey[] | undefined;
    return <HeroKpisWidget data={dashboardData} heroMetrics={heroMetrics} />;
  }
  if (type === "metrics.quickPills") {
    return <QuickPillsWidget data={dashboardData} />;
  }
  if (type === "chart.performance") {
    const chartMetrics = instance.config.chartMetrics as MetricKey[] | undefined;
    const chartStyle = parseExtendedChartStyle(instance.config.chartStyle);
    const barLayout = (instance.config.barLayout as ChartBarLayout | undefined) ?? "vertical";
    const visual = parseSlotVisualConfig(instance.config);
    return (
      <PerformanceChartWidget
        data={dashboardData}
        chartMetrics={normalizeChartMetrics(chartMetrics)}
        chartStyle={chartStyle}
        barLayout={barLayout}
        visual={visual}
        onChartMetricsChange={(metrics) =>
          onWidgetConfigChange?.(instance.id, { chartMetrics: metrics })
        }
      />
    );
  }
  if (type === "alerts.feed") {
    const density = (instance.config.density as AlertsDensity | undefined) ?? "stacked";
    return <AlertsFeedWidget data={dashboardData} density={density} />;
  }
  if (type === "clients.health") {
    const view = (instance.config.view as ClientsHealthView | undefined) ?? "full";
    return <AgencyHealthWidget data={dashboardData} view={view} />;
  }
  if (type === "ai.agencyBrain") {
    return <AgencyBrainWidget />;
  }
  if (type === "ai.accountHealth") {
    return <AccountHealthWidget />;
  }
  if (type === "ai.recentLearnings") {
    return (
      <RecentLearningsWidget
        learnings={toBrainShelfLearnings(dashboardData.brainLearnings)}
        loading={dashboardData.brainLearningsLoading}
      />
    );
  }
  if (type === "layout.taskbar" || type === "premium.metricMatrix") {
    const orientation = (instance.config.orientation as TaskbarOrientation | undefined) ?? "horizontal";
    const slots = normalizeTaskbarSlots(instance.config.slots);
    return <TaskbarWidget data={dashboardData} orientation={orientation} slots={slots} />;
  }
  if (type === "premium.multiChart") {
    const chartMetrics = instance.config.chartMetrics as MetricKey[] | undefined;
    const chartStyle = parseExtendedChartStyle(instance.config.chartStyle);
    const barLayout = (instance.config.barLayout as ChartBarLayout | undefined) ?? "vertical";
    const visual = parseSlotVisualConfig(instance.config);
    return (
      <PerformanceChartWidget
        data={dashboardData}
        chartMetrics={normalizeChartMetrics(chartMetrics)}
        chartStyle={chartStyle}
        barLayout={barLayout}
        visual={visual}
        onChartMetricsChange={(metrics) =>
          onWidgetConfigChange?.(instance.id, { chartMetrics: metrics })
        }
      />
    );
  }
  if (type === "advanced.scatter") {
    const metricX = (instance.config.metricX as MetricKey | undefined) ?? "spend";
    const metricY = (instance.config.metricY as MetricKey | undefined) ?? "roas";
    const pointSize = (instance.config.pointSize as "small" | "medium" | "large" | undefined) ?? "medium";
    return (
      <ScatterWidget
        data={dashboardData}
        metricX={metricX}
        metricY={metricY}
        pointSize={pointSize}
      />
    );
  }
  if (type === "advanced.heatmap") {
    const heatmapMetric = (instance.config.heatmapMetric as MetricKey | undefined) ?? "spend";
    const visual = parseSlotVisualConfig(instance.config);
    return (
      <HeatmapWidget
        data={dashboardData}
        heatmapMetric={heatmapMetric}
        cellScale={visual.cellScale}
        heatmapColorScale={visual.heatmapColorScale}
        visual={visual}
      />
    );
  }
  if (type === "advanced.radar") {
    const chartMetrics = instance.config.chartMetrics as MetricKey[] | undefined;
    const visual = parseSlotVisualConfig(instance.config);
    return (
      <RadarStandaloneWidget
        data={dashboardData}
        chartMetrics={normalizeChartMetrics(chartMetrics)}
        visual={visual}
      />
    );
  }
  if (type === "advanced.pareto") {
    const metric = (instance.config.metric as MetricKey | undefined) ?? "spend";
    const sortDescending = instance.config.sortDescending !== false;
    const visual = parseSlotVisualConfig(instance.config);
    return (
      <ParetoWidget
        data={dashboardData}
        metric={metric}
        sortDescending={sortDescending}
        visual={visual}
      />
    );
  }
  if (type === "premium.bullet") {
    const metric = (instance.config.metric as MetricKey | undefined) ?? "roas";
    const targetValue =
      typeof instance.config.targetValue === "number" ? instance.config.targetValue : undefined;
    const visual = parseSlotVisualConfig(instance.config);
    return (
      <BulletWidget
        data={dashboardData}
        metric={metric}
        targetValue={targetValue}
        visual={visual}
      />
    );
  }
  if (type === "advanced.boxplot") {
    const metric = (instance.config.metric as MetricKey | undefined) ?? "spend";
    const groupBy =
      (instance.config.boxPlotGroupBy as "campaign" | "client" | "dayOfWeek" | undefined) ??
      "dayOfWeek";
    const visual = parseSlotVisualConfig(instance.config);
    return (
      <BoxPlotWidget data={dashboardData} metric={metric} groupBy={groupBy} visual={visual} />
    );
  }
  if (type === "ai.correlation") {
    const metricA = (instance.config.metricA as MetricKey | undefined) ?? "spend";
    const metricB = (instance.config.metricB as MetricKey | undefined) ?? "conversions";
    const showTrend = instance.config.showTrend !== false;
    return (
      <AiCorrelationWidget
        data={dashboardData}
        metricA={metricA}
        metricB={metricB}
        showTrend={showTrend}
      />
    );
  }
  if (type === "metrics.card" || type.startsWith("metric.single.")) {
    const metricKey = resolveMetricKeyFromWidget(type, instance.config);
    const cardStyle = (instance.config.cardStyle as MetricCardStyle | undefined) ?? "centered";
    return <SingleMetricWidget data={dashboardData} metricKey={metricKey} cardStyle={cardStyle} />;
  }
  const def = getWidgetDefinition(type);
  if (def?.component === "DualMetricChartWidget") {
    const metricA = (instance.config.metricA as MetricKey) ?? "roas";
    const metricB = (instance.config.metricB as MetricKey) ?? "cpa";
    const chartStyle = parseExtendedChartStyle(instance.config.chartStyle);
    const barLayout = (instance.config.barLayout as ChartBarLayout | undefined) ?? "vertical";
    const visual = parseSlotVisualConfig(instance.config);
    return (
      <DualMetricChartWidget
        data={dashboardData}
        metricA={metricA}
        metricB={metricB}
        chartStyle={chartStyle}
        barLayout={barLayout}
        visual={visual}
      />
    );
  }

  return (
    <div className="flex h-full items-center justify-center text-xs" style={{ color: "var(--text-dim)" }}>
      {t("comingSoon")}
    </div>
  );
}
