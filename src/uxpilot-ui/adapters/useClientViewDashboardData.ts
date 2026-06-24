"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

import { formatMetricValue, DEFAULT_DASHBOARD_CHART_METRICS, type MetricKey } from "@/lib/dashboard-metrics";
import { DEFAULT_DASHBOARD_LAYOUT } from "@/lib/dashboard-layout-prefs";
import { DEFAULT_REPORT_TZ } from "@/lib/report-period";
import type { PeriodState } from "@/components/PeriodFilter";

/** Minimal dashboard data surface for read-only client views. */
export function useClientViewDashboardData() {
  const locale = useLocale();
  const tMetrics = useTranslations("metrics");

  const metricLabel = useMemo(
    () => (key: MetricKey) => tMetrics(key),
    [tMetrics]
  );

  return {
    loading: false,
    note: null,
    summary: null,
    prevSummary: null,
    series: [],
    variations: [],
    criticalAlerts: [],
    clients: [],
    brainLearnings: [],
    brainLearningsLoading: false,
    brainLearningsCount: 0,
    brainHypothesesCount: 0,
    brainSummaryLoading: false,
    ageBreakdown: [],
    ageBreakdownLoading: false,
    chartMetrics: DEFAULT_DASHBOARD_CHART_METRICS,
    toggleChartMetric: () => {},
    dashboardLayout: DEFAULT_DASHBOARD_LAYOUT,
    persistDashboardCustomization: () => {},
    clientMetric: "roas" as MetricKey,
    dominantPreset: undefined,
    isEmptyState: false,
    locale,
    activeTz: DEFAULT_REPORT_TZ,
    period: { preset: "last30", since: "", until: "" } satisfies PeriodState,
    periodLabel: "",
    metricLabel,
    chartMetricLabels: {} as Record<MetricKey, string>,
    vsLabel: "",
    chartSubtitle: "",
    formatMetricValue: (key: MetricKey, value: number) => formatMetricValue(key, value, locale)
  };
}
