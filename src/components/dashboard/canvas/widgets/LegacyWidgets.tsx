"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { CanvasAgencyHealth } from "@/components/dashboard/canvas/widgets/CanvasAgencyHealth";
import { CanvasMetricStrip, type CanvasMetricItem } from "@/components/dashboard/canvas/widgets/CanvasMetricStrip";
import { METRIC_BY_KEY } from "@/lib/dashboard-metrics";
import { MetricPrismPrimary } from "@/components/dashboard/MetricPrism";
import { BrainShelf } from "@/components/dashboard/BrainShelf";
import { AgeBreakdownCard } from "@/components/dashboard/AgeBreakdownCard";
import { DashboardPerformanceChart } from "@/components/dashboard/DashboardPerformanceChart";
import { LiveIntelligenceFeed } from "@/components/dashboard/LiveIntelligenceFeed";
import type { AlertsDensity, ClientsHealthView } from "@/lib/dashboard/widget-config";
import {
  parseExtendedChartStyle,
  parseSlotVisualConfig,
  type ExtendedChartStyle,
  type SlotVisualConfig
} from "@/lib/dashboard/slot-visual-config";
import {
  normalizeChartMetrics,
  toggleChartMetricSelection,
  type ChartBarLayout
} from "@/lib/dashboard/chart-metrics";
import { MAX_CANVAS_CHART_METRICS, type MetricKey } from "@/lib/dashboard-metrics";
import {
  toAgencyHealth,
  toBrainShelfLearnings,
  toChartData,
  toIntelligenceEvents,
  toMetricPrismProps
} from "@/uxpilot-ui/adapters/dashboard-mappers";
import type { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";

type DashboardData = ReturnType<typeof useDashboardData>;

export function BrainLearningsWidget({ data }: { data: DashboardData }) {
  return (
    <div className="dashboard-brain-notice flex h-full min-h-0 w-full">
      <BrainShelf
        variant="notice"
        isLoading={data.brainSummaryLoading ?? data.brainLearningsLoading}
        hypothesesCount={data.brainHypothesesCount ?? 0}
        learningsCount={data.brainLearningsCount ?? data.brainLearnings.length}
        suggestionsCount={data.brainLearnings.length}
      />
    </div>
  );
}

export function HeroKpisWidget({
  data,
  heroMetrics
}: {
  data: DashboardData;
  heroMetrics?: MetricKey[];
}) {
  const { primaryKPIs } = toMetricPrismProps({
    summary: data.summary ?? {},
    prevSummary: data.prevSummary,
    series: data.series,
    dominantPreset: data.dominantPreset,
    heroMetrics,
    locale: data.locale,
    metricLabel: data.metricLabel,
    vsLabel: data.vsLabel,
    newDeltaLabel: data.deltaNewLabel
  });
  return <MetricPrismPrimary primaryKPIs={primaryKPIs} isLoading={data.loading} />;
}

export function QuickPillsWidget({ data }: { data: DashboardData }) {
  const { secondaryMetrics } = toMetricPrismProps({
    summary: data.summary ?? {},
    prevSummary: data.prevSummary,
    series: data.series,
    dominantPreset: data.dominantPreset,
    locale: data.locale,
    metricLabel: data.metricLabel,
    vsLabel: data.vsLabel,
    newDeltaLabel: data.deltaNewLabel
  });
  const items: CanvasMetricItem[] = secondaryMetrics.map((m) => ({
    label: m.label,
    value: m.value,
    change: m.change,
    trend: m.trend,
    color: m.key ? METRIC_BY_KEY[m.key]?.color : undefined,
    metricKey: m.key
  }));

  return <CanvasMetricStrip items={items} isLoading={data.loading} />;
}

export function AgeBreakdownWidget({
  data,
  embedded = true
}: {
  data: DashboardData;
  embedded?: boolean;
}) {
  return (
    <AgeBreakdownCard rows={data.ageBreakdown} isLoading={data.ageBreakdownLoading} embedded={embedded} />
  );
}

export function PerformanceChartWidget({
  data,
  chartMetrics,
  chartStyle = "area",
  barLayout = "vertical",
  visual,
  onChartMetricsChange,
  compact = false,
  chartVariant
}: {
  data: DashboardData;
  chartMetrics?: MetricKey[];
  chartStyle?: ExtendedChartStyle;
  barLayout?: ChartBarLayout;
  visual?: SlotVisualConfig;
  onChartMetricsChange?: (metrics: MetricKey[]) => void;
  compact?: boolean;
  /** page = Destaques-style panel; canvas = compact builder cell */
  chartVariant?: "page" | "canvas";
}) {
  const widgetScoped = chartMetrics !== undefined;
  const [activeMetrics, setActiveMetrics] = useState<MetricKey[]>(() =>
    normalizeChartMetrics(chartMetrics, data.chartMetrics)
  );

  useEffect(() => {
    setActiveMetrics(normalizeChartMetrics(chartMetrics, data.chartMetrics));
  }, [chartMetrics, data.chartMetrics]);

  const handleToggle = useCallback(
    (key: MetricKey) => {
      if (widgetScoped) {
        setActiveMetrics((cur) => {
          const next = toggleChartMetricSelection(cur, key, MAX_CANVAS_CHART_METRICS);
          onChartMetricsChange?.(next);
          return next;
        });
        return;
      }
      data.toggleChartMetric(key);
    },
    [widgetScoped, onChartMetricsChange, data]
  );

  const metrics = widgetScoped ? activeMetrics : data.chartMetrics;
  const variant = chartVariant ?? (compact ? "embedded" : "canvas");

  return (
    <DashboardPerformanceChart
      data={toChartData(data.series, data.locale)}
      activeMetrics={metrics}
      onToggleMetric={compact ? undefined : handleToggle}
      formatValue={data.formatMetricValue}
      metricLabels={data.chartMetricLabels}
      isLoading={data.loading}
      subtitle={variant === "page" ? data.chartSubtitle : compact ? undefined : data.vsLabel}
      variant={variant}
      chartStyle={chartStyle}
      barLayout={barLayout}
      visual={visual}
      disableToggle={compact}
      metricSummary={data.summary ?? undefined}
    />
  );
}

export function AlertsFeedWidget({
  data,
  density = "stacked"
}: {
  data: DashboardData;
  density?: AlertsDensity;
}) {
  const t = useTranslations("dashboard");
  const events = toIntelligenceEvents({
    variations: data.variations,
    criticalAlerts: data.criticalAlerts,
    metricLabel: data.metricLabel,
    vsLabel: data.vsLabel,
    nowLabel: t("now"),
    recentLabel: t("recently")
  });
  return <LiveIntelligenceFeed events={events} isLoading={data.loading} variant={density} embedded />;
}

export function AgencyHealthWidget({
  data,
  view = "full"
}: {
  data: DashboardData;
  view?: ClientsHealthView;
}) {
  const t = useTranslations("dashboard");
  const agencyHealth = toAgencyHealth({
    clients: data.clients,
    locale: data.locale,
    labels: {
      activeClients: t("agencyHealthActiveClients"),
      healthy: t("agencyHealthHealthy"),
      alerts: t("agencyHealthAlerts"),
      totalSpend: t("agencyHealthTotalSpend")
    }
  });
  return (
    <CanvasAgencyHealth
      healthMetrics={agencyHealth.healthMetrics}
      clients={agencyHealth.clients}
      isLoading={data.loading}
      view={view}
    />
  );
}
