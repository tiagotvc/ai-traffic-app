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
import { DualMetricChartWidget, SingleMetricWidget } from "@/components/dashboard/canvas/widgets/MetricWidgets";
import type { WidgetInstanceDto } from "@/lib/dashboard/widget-catalog";
import type { MetricKey } from "@/lib/dashboard-metrics";
import { toBrainShelfLearnings } from "@/uxpilot-ui/adapters/dashboard-mappers";
import type { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";

type DashboardData = ReturnType<typeof useDashboardData>;

export function WidgetRenderer({
  instance,
  dashboardData
}: {
  instance: WidgetInstanceDto;
  dashboardData: DashboardData;
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
    return <PerformanceChartWidget data={dashboardData} chartMetrics={chartMetrics} />;
  }
  if (type === "alerts.feed") {
    return <AlertsFeedWidget data={dashboardData} />;
  }
  if (type === "clients.health") {
    return <AgencyHealthWidget data={dashboardData} />;
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
  if (type.startsWith("metric.single.")) {
    const metricKey = (instance.config.metricKey as MetricKey) ?? type.replace("metric.single.", "") as MetricKey;
    return <SingleMetricWidget data={dashboardData} metricKey={metricKey} />;
  }
  if (type === "chart.roasCpa" || type === "chart.spendConversions") {
    const metricA = (instance.config.metricA as MetricKey) ?? "roas";
    const metricB = (instance.config.metricB as MetricKey) ?? "cpa";
    return <DualMetricChartWidget data={dashboardData} metricA={metricA} metricB={metricB} />;
  }

  return (
    <div className="flex h-full items-center justify-center text-xs" style={{ color: "var(--text-dim)" }}>
      {t("comingSoon")}
    </div>
  );
}
