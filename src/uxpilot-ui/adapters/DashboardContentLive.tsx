"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Calendar, Settings2, Sparkles } from "lucide-react";

import { AgeBreakdownCard } from "@/components/dashboard/AgeBreakdownCard";
import { BrainShelf } from "@/components/dashboard/BrainShelf";
import { DashboardCustomizeModal } from "@/components/dashboard/DashboardCustomizeModal";
import { DashboardPerformanceChart } from "@/components/dashboard/DashboardPerformanceChart";
import { MetricPrism } from "@/components/dashboard/MetricPrism";
import { PageToolbar } from "@/components/layout/PageToolbar";
import {
  CHART_PANEL_MIN_HEIGHT,
  resolveVisibleSectionOrder,
  type DashboardSectionKey
} from "@/lib/dashboard-layout-prefs";
import ConnectAccountCard from "@/uxpilot-ui/components/ConnectAccountCard";
import {
  toChartData,
  toMetricPrismProps
} from "@/uxpilot-ui/adapters/dashboard-mappers";
import { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";
import { useIsMobile } from "@/uxpilot-ui/hooks/use-mobile";

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
        <div className="dashboard-panel rounded-2xl p-4 sm:p-5" style={{ minHeight: chartMinHeight }}>
          <DashboardPerformanceChart
            data={chartData}
            activeMetrics={data.chartMetrics}
            onToggleMetric={data.toggleChartMetric}
            formatValue={data.formatMetricValue}
            metricLabels={data.chartMetricLabels}
            metricSummary={data.summary ?? undefined}
            isLoading={data.loading}
            subtitle={data.chartSubtitle}
          />
        </div>
      );
      const agePanel = (
        <AgeBreakdownCard rows={data.ageBreakdown} isLoading={data.ageBreakdownLoading} />
      );

      if (performancePair) {
        return (
          <div key="performance" className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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

  return (
    <main
      className="flex-1 space-y-4 overflow-y-auto px-0 py-0 md:px-0"
      style={{ scrollbarWidth: "thin", scrollbarColor: "var(--scrollbar-color) transparent" }}
    >
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

      {data.note ? <div className="ui-alert-info">{data.note}</div> : null}

      <div className="tab-transition animate-fade-up space-y-5">
        {!data.loading && data.isEmptyState ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ConnectAccountCard />
            <div
              className="flex flex-col gap-4 rounded-2xl border p-6"
              style={{ background: "var(--surface-card)", border: "1px solid var(--border-color)" }}
            >
              <h3 className="font-heading font-semibold" style={{ color: "var(--text-main)" }}>
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
                  <span className="text-sm font-body" style={{ color: "var(--text-dim)" }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          sectionOrder.map((key) => {
            if (renderedPerformanceKeys.has(key)) {
              if (performancePair === "chart-first" && key === "chart") {
                return renderSection(key, false);
              }
              if (performancePair === "age-first" && key === "ageBreakdown") {
                return renderSection(key, false);
              }
              return null;
            }
            return renderSection(key, false);
          })
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
    </main>
  );
}
