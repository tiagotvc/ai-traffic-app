"use client";

import { useTranslations } from "next-intl";

import { CanvasMetricStrip } from "@/components/dashboard/canvas/widgets/CanvasMetricStrip";
import { AgencyHealthLayout } from "@/components/dashboard/AgencyHealthLayout";
import { BrainShelf } from "@/components/dashboard/BrainShelf";
import { DashboardPerformanceChart } from "@/components/dashboard/DashboardPerformanceChart";
import { LiveIntelligenceFeed } from "@/components/dashboard/LiveIntelligenceFeed";
import type { MetricKey } from "@/lib/dashboard-metrics";
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
  const brainItems = toBrainShelfLearnings(data.brainLearnings);
  return <BrainShelf suggestions={brainItems} isLoading={data.brainLearningsLoading} compact />;
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
    vsLabel: data.vsLabel
  });
  const items = primaryKPIs.map((kpi) => ({
    label: kpi.label,
    value: kpi.value,
    change: kpi.change,
    trend: kpi.trend
  }));
  return <CanvasMetricStrip items={items} isLoading={data.loading} />;
}

export function QuickPillsWidget({ data }: { data: DashboardData }) {
  const { secondaryMetrics } = toMetricPrismProps({
    summary: data.summary ?? {},
    prevSummary: data.prevSummary,
    series: data.series,
    dominantPreset: data.dominantPreset,
    locale: data.locale,
    metricLabel: data.metricLabel,
    vsLabel: data.vsLabel
  });
  return <CanvasMetricStrip items={secondaryMetrics} isLoading={data.loading} />;
}

export function PerformanceChartWidget({
  data,
  chartMetrics
}: {
  data: DashboardData;
  chartMetrics?: MetricKey[];
}) {
  const metrics = chartMetrics ?? data.chartMetrics;
  return (
    <DashboardPerformanceChart
      data={toChartData(data.series, data.locale)}
      activeMetrics={metrics}
      onToggleMetric={data.toggleChartMetric}
      formatValue={data.formatMetricValue}
      metricLabels={data.chartMetricLabels}
      isLoading={data.loading}
      subtitle={data.vsLabel}
    />
  );
}

export function AlertsFeedWidget({ data }: { data: DashboardData }) {
  const t = useTranslations("dashboard");
  const events = toIntelligenceEvents({
    variations: data.variations,
    criticalAlerts: data.criticalAlerts,
    metricLabel: data.metricLabel,
    vsLabel: data.vsLabel,
    nowLabel: t("now"),
    recentLabel: t("recently")
  });
  return <LiveIntelligenceFeed events={events} isLoading={data.loading} />;
}

export function AgencyHealthWidget({ data }: { data: DashboardData }) {
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
    <AgencyHealthLayout
      healthMetrics={agencyHealth.healthMetrics}
      clients={agencyHealth.clients}
      isLoading={data.loading}
    />
  );
}
