"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Calendar, Settings2, Sparkles } from "lucide-react";

import { AgeBreakdownCard } from "@/components/dashboard/AgeBreakdownCard";
import { BrainShelf } from "@/components/dashboard/BrainShelf";
import { DashboardCustomizeModal } from "@/components/dashboard/DashboardCustomizeModal";
import { DashboardInsightPanels } from "@/components/dashboard/DashboardInsightPanels";
import { DashboardPerformanceChart } from "@/components/dashboard/DashboardPerformanceChart";
import { MetricPrism } from "@/components/dashboard/MetricPrism";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { AppPageShell } from "@/components/layout/AppPageShell";
import { DsInfoBanner } from "@/design-system";
import {
  CHART_PANEL_MIN_HEIGHT,
  DASHBOARD_PAGE_CHART_HEIGHT,
  resolveVisibleSectionOrder,
  type DashboardSectionKey
} from "@/lib/dashboard-layout-prefs";
import ConnectAccountCard from "@/uxpilot-ui/components/ConnectAccountCard";
import {
  toChartData,
  toDashboardCampaignStatus,
  toDashboardFunnelSteps,
  toDashboardMetricSections,
  toDashboardTopCampaigns,
  toMetricPrismProps
} from "@/uxpilot-ui/adapters/dashboard-mappers";
import { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";
import { useIsMobile } from "@/uxpilot-ui/hooks/use-mobile";
import type { MetricKey } from "@/lib/dashboard-metrics";
import { MAX_CHART_METRICS } from "@/lib/dashboard-metrics";

const PAGE_CHART_METRICS: MetricKey[] = [
  "spend",
  "roas",
  "clicks",
  "impressions",
  "conversions",
  "ctr"
];

export function DashboardContentLive({ readOnly = false }: { readOnly?: boolean }) {
  const t = useTranslations("dashboard");
  const data = useDashboardData();
  const isMobile = useIsMobile();
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const summary = data.summary ?? {};
  const sections = data.dashboardLayout.sections;
  // Seções "alerts" e "agencyHealth" foram removidas do dashboard (continuam disponíveis
  // como componentes para o módulo Visão). Filtramos aqui para garantir que não apareçam
  // mesmo em preferências antigas já salvas.
  const sectionOrder = resolveVisibleSectionOrder(data.dashboardLayout).filter(
    (key) => key !== "alerts" && key !== "agencyHealth"
  );
  const chartMinHeight = CHART_PANEL_MIN_HEIGHT[data.dashboardLayout.chartSize];
  const chartPlotHeight = DASHBOARD_PAGE_CHART_HEIGHT[data.dashboardLayout.chartSize];

  const { primaryKPIs, secondaryMetrics } = toMetricPrismProps({
    summary,
    prevSummary: data.prevSummary,
    series: data.series,
    dominantPreset: data.dominantPreset,
    heroMetrics: data.dashboardLayout.heroMetrics,
    locale: data.locale,
    metricLabel: data.metricLabel,
    vsLabel: data.vsLabel
  });

  const chartData = toChartData(data.series, data.locale);

  const pageChartMetrics = useMemo(() => {
    const filtered = data.chartMetrics.filter((m) => PAGE_CHART_METRICS.includes(m));
    if (filtered.length > 0) return filtered.slice(0, MAX_CHART_METRICS);
    return PAGE_CHART_METRICS.slice(0, MAX_CHART_METRICS);
  }, [data.chartMetrics]);

  const insightPanels = useMemo(() => {
    const summary = data.summary ?? {};
    return {
      metricSections: toDashboardMetricSections({
        summary,
        prevSummary: data.prevSummary,
        locale: data.locale,
        metricLabel: data.metricLabel,
        sectionTitles: {
          conversion: t("widgetSectionConversion"),
          funnel: t("widgetSectionFunnel"),
          closing: t("widgetSectionClosing")
        }
      }),
      funnelSteps: toDashboardFunnelSteps({
        summary,
        locale: data.locale,
        labels: {
          impressions: data.metricLabel("impressions"),
          clicks: data.metricLabel("clicks"),
          pageViews: t("widgetFunnelPageViews"),
          conversions: data.metricLabel("conversions")
        }
      }),
      campaignStatus: toDashboardCampaignStatus({
        campaigns: data.campaignSnapshots,
        labels: {
          active: t("widgetCampaignStatusActive"),
          paused: t("widgetCampaignStatusPaused"),
          draft: t("widgetCampaignStatusDraft"),
          other: t("widgetCampaignStatusOther")
        }
      }),
      topCampaigns: toDashboardTopCampaigns({
        campaigns: data.campaignSnapshots,
        locale: data.locale
      })
    };
  }, [
    data.summary,
    data.prevSummary,
    data.locale,
    data.metricLabel,
    data.campaignSnapshots,
    t
  ]);
  const emptyStateItems = [
    t("emptyStateItem1"),
    t("emptyStateItem2"),
    t("emptyStateItem3"),
    t("emptyStateItem4"),
    t("emptyStateItem5")
  ];

  // Performance e Faixa etária dividem a mesma linha (lado a lado) quando ambos visíveis.
  const performancePair = useMemo(() => {
    const chartIdx = sectionOrder.indexOf("chart");
    const ageIdx = sectionOrder.indexOf("ageBreakdown");
    if (!sections.chart || !sections.ageBreakdown) return null;
    if (chartIdx < 0 || ageIdx < 0) return null;
    return chartIdx < ageIdx ? ("chart-first" as const) : ("age-first" as const);
  }, [sectionOrder, sections.chart, sections.ageBreakdown]);

  function renderSection(key: DashboardSectionKey, skipPerformance = false) {
    if (!sections[key] || data.isEmptyState) return null;

    if (key === "brainShelf") {
      return (
        <BrainShelf
          key={key}
          isLoading={data.brainSummaryLoading}
          variant="notice"
          hypothesesCount={data.brainHypothesesCount}
          learningsCount={data.brainLearningsCount}
          suggestionsCount={data.brainLearnings.length}
        />
      );
    }

    if (key === "heroKpis" || key === "secondaryMetrics") {
      const showHero = sections.heroKpis;
      const showSecondary = sections.secondaryMetrics;
      if (!showHero && !showSecondary) return null;
      const heroIdx = sectionOrder.indexOf("heroKpis");
      const secIdx = sectionOrder.indexOf("secondaryMetrics");
      if (key === "secondaryMetrics" && heroIdx >= 0 && secIdx > heroIdx && showHero) return null;
      if (key === "heroKpis" && secIdx >= 0 && secIdx < heroIdx && showSecondary) return null;

      return (
        <MetricPrism
          key="metrics"
          primaryKPIs={showHero ? primaryKPIs : []}
          secondaryMetrics={showSecondary ? secondaryMetrics : []}
          secondaryTitle={showSecondary ? t("supportingTitle") : undefined}
          isLoading={data.loading}
        />
      );
    }

    if (key === "chart" || key === "ageBreakdown") {
      if (skipPerformance) return null;

      const chartPanel = (
        <div className="dashboard-card dashboard-card--compact" style={{ minHeight: chartMinHeight }}>
          <DashboardPerformanceChart
            data={chartData}
            activeMetrics={pageChartMetrics}
            onToggleMetric={data.toggleChartMetric}
            formatValue={data.formatMetricValue}
            metricLabels={data.chartMetricLabels}
            metricSummary={data.summary ?? undefined}
            isLoading={data.loading}
            subtitle={data.chartSubtitle}
            previewHeight={chartPlotHeight}
            availableMetrics={PAGE_CHART_METRICS}
            dualAxisAlways
          />
        </div>
      );
      const agePanel = (
        <AgeBreakdownCard rows={data.ageBreakdown} isLoading={data.ageBreakdownLoading} />
      );

      if (performancePair) {
        return (
          <div key="performance" className="grid grid-cols-1 gap-[var(--app-section-gap)] xl:grid-cols-2">
            {performancePair === "chart-first" ? (
              <>
                {chartPanel}
                {agePanel}
              </>
            ) : (
              <>
                {agePanel}
                {chartPanel}
              </>
            )}
          </div>
        );
      }

      if (key === "chart" && sections.chart) return <div key={key}>{chartPanel}</div>;
      if (key === "ageBreakdown" && sections.ageBreakdown) return <div key={key}>{agePanel}</div>;
      return null;
    }

    return null;
  }

  const renderedPerformanceKeys = new Set<DashboardSectionKey>();
  if (performancePair) {
    renderedPerformanceKeys.add("chart");
    renderedPerformanceKeys.add("ageBreakdown");
  }

  let metricsBlockRendered = false;
  const metricsAnchorKey = sectionOrder.find(
    (key) => key === "heroKpis" || key === "secondaryMetrics"
  );

  return (
    <AppPageShell as="main" className="flex-1 overflow-y-auto">
      <PageToolbar
        icon={<Sparkles size={16} />}
        title={t("highlights")}
        subtitle={
          <>
            <span>{t("highlightsSubtitle")}</span>
            {!data.isEmptyState ? (
              <span
                className="ml-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  borderColor: "var(--chart-frame-border)",
                  background: "var(--chart-frame-bg)",
                  color: "var(--text-dim)"
                }}
              >
                <Calendar size={10} />
                {data.periodLabel}
              </span>
            ) : null}
          </>
        }
        showGlobalFilters
        showSync
        actions={
          !readOnly && !data.isEmptyState && !isMobile ? (
            <button
              type="button"
              onClick={() => setCustomizeOpen(true)}
              className="flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors hover:bg-[var(--surface-bg)]"
              style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
            >
              <Settings2 size={14} />
              {t("layoutCustomize")}
            </button>
          ) : null
        }
      />

      {data.note ? <DsInfoBanner className="px-4 py-2.5 text-sm">{data.note}</DsInfoBanner> : null}

      <div className="tab-transition animate-fade-up">
        {!data.loading && data.isEmptyState ? (
          <div className="grid grid-cols-1 gap-[var(--app-section-gap)] md:grid-cols-2">
            <ConnectAccountCard />
            <div className="dashboard-card dashboard-card--compact flex flex-col gap-3">
              <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">
                {t("emptyStateTitle")}
              </h3>
              {emptyStateItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div
                    className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ background: "rgba(79,70,229,0.2)" }}
                  >
                    <div className="h-1.5 w-1.5 rounded-full" style={{ background: "#818cf8" }} />
                  </div>
                  <span className="text-xs font-body text-[var(--text-dim)]">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="tab-transition animate-fade-up flex flex-col gap-[var(--app-section-gap)]">
            {sectionOrder.map((key) => {
              if (renderedPerformanceKeys.has(key)) {
                if (performancePair === "chart-first" && key === "chart") {
                  return renderSection(key, false);
                }
                if (performancePair === "age-first" && key === "ageBreakdown") {
                  return renderSection(key, false);
                }
                return null;
              }

              const section = renderSection(key, false);
              const isMetricsBlock = key === "heroKpis" || key === "secondaryMetrics";
              if (isMetricsBlock && key !== metricsAnchorKey) return null;
              if (isMetricsBlock && metricsBlockRendered) return null;

              if (isMetricsBlock && key === metricsAnchorKey) {
                metricsBlockRendered = true;
                if (!section) return null;
                return (
                  <div key="metrics-and-insights" className="flex flex-col gap-[var(--app-section-gap)]">
                    {section}
                    <DashboardInsightPanels
                      metricSections={insightPanels.metricSections}
                      funnelSteps={insightPanels.funnelSteps}
                      campaignStatus={insightPanels.campaignStatus}
                      topCampaigns={insightPanels.topCampaigns}
                      isLoading={data.loading || data.campaignsLoading}
                    />
                  </div>
                );
              }

              return section;
            })}
          </div>
        )}
      </div>

      {!readOnly ? (
        <DashboardCustomizeModal
          open={customizeOpen}
          layout={data.dashboardLayout}
          chartMetrics={data.chartMetrics}
          onClose={() => setCustomizeOpen(false)}
          onApply={(next) => {
            data.persistDashboardCustomization(next);
            setCustomizeOpen(false);
          }}
        />
      ) : null}
    </AppPageShell>
  );
}
