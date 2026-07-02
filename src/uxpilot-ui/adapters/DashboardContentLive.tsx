"use client";

import { useMemo, useState, type ReactElement, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Settings2, Sparkles } from "lucide-react";

import { BrainShelf } from "@/components/dashboard/BrainShelf";
import { AgeBreakdownCard } from "@/components/dashboard/AgeBreakdownCard";
import { DashboardCustomizeModal } from "@/components/dashboard/DashboardCustomizeModal";
import { DashboardPerformanceChart } from "@/components/dashboard/DashboardPerformanceChart";
import {
  AdLibraryInsightsPanel,
  CampaignObjectivesPanel,
  ProfitByCampaignPanel,
  TopCampaignsRow,
  VirtualFunnelPanel
} from "@/components/dashboard/DashboardInsightPanels";
import { MetricPrism } from "@/components/dashboard/MetricPrism";
import { ActiveScopeFilterBadges } from "@/components/layout/ActiveScopeFilterBadges";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { AppPageShell } from "@/components/layout/AppPageShell";
import { DsCard, DsInfoBanner } from "@/design-system";
import {
  DASHBOARD_PAGE_CHART_HEIGHT,
  resolveVisibleSectionOrder,
  type DashboardSectionKey
} from "@/lib/dashboard-layout-prefs";
import { buildDashboardSectionGroups } from "@/lib/dashboard-section-rows";
import ConnectAccountCard from "@/uxpilot-ui/components/ConnectAccountCard";
import {
  toChartData,
  toDashboardCampaignStatus,
  toDashboardFunnelSteps,
  toDashboardObjectiveBreakdown,
  toDashboardProfitByCampaign,
  toDashboardTopCampaigns,
  toDashboardTopCampaignsBySpend,
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
  const tPresets = useTranslations("campaignPresets");
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
  const chartPlotHeight = DASHBOARD_PAGE_CHART_HEIGHT[data.dashboardLayout.chartSize];

  const { primaryKPIs, secondaryMetrics } = toMetricPrismProps({
    summary,
    prevSummary: data.prevSummary,
    series: data.series,
    dominantPreset: data.dominantPreset,
    heroMetrics: data.dashboardLayout.heroMetrics,
    periodMetrics: data.dashboardLayout.periodMetrics,
    locale: data.locale,
    metricLabel: data.metricLabel,
    vsLabel: data.vsLabel,
    newDeltaLabel: data.deltaNewLabel
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
      campaignObjectives: toDashboardObjectiveBreakdown({
        campaigns: data.campaignSnapshots,
        labelForPreset: (preset) => {
          const key = preset.startsWith("custom:") ? "default" : preset;
          if (key in { default: 1, lead_whatsapp: 1, lead_site: 1, sales: 1, reach: 1 }) {
            return tPresets(key as "default");
          }
          return preset;
        }
      }),
      topCampaigns: toDashboardTopCampaigns({
        campaigns: data.campaignSnapshots,
        locale: data.locale
      }),
      topCampaignsBySpend: toDashboardTopCampaignsBySpend({
        campaigns: data.campaignSnapshots,
        locale: data.locale
      }),
      profitByCampaign: toDashboardProfitByCampaign({
        campaigns: data.campaignSnapshots,
        locale: data.locale
      })
    };
  }, [data.summary, data.locale, data.campaignSnapshots, data.metricLabel, t, tPresets]);
  const emptyStateItems = [
    t("emptyStateItem1"),
    t("emptyStateItem2"),
    t("emptyStateItem3"),
    t("emptyStateItem4"),
    t("emptyStateItem5")
  ];

  function renderSection(key: DashboardSectionKey) {
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

    if (key === "chart") {
      return (
        <div
          key={key}
          className="campaign-creator-card campaign-creator-card--compact flex min-h-[400px] min-w-0 w-full flex-col"
        >
          <DashboardPerformanceChart
            data={chartData}
            activeMetrics={pageChartMetrics}
            onToggleMetric={(metricKey) =>
              data.toggleChartMetric(metricKey, { scope: PAGE_CHART_METRICS })
            }
            formatValue={data.formatMetricValue}
            metricLabels={data.chartMetricLabels}
            metricSummary={data.summary ?? undefined}
            isLoading={data.loading}
            subtitle={data.chartSubtitle}
            previewHeight={chartPlotHeight}
            availableMetrics={PAGE_CHART_METRICS}
            title={t("metricsChartTitle")}
            variant="page"
            chartStyle="line"
            lineVisual="report"
            dualAxisAlways
            fillHeight
          />
        </div>
      );
    }

    if (key === "ageBreakdown") {
      return (
        <div key={key} className="flex min-h-[400px] min-w-0 w-full">
          <AgeBreakdownCard
            rows={data.ageBreakdown ?? []}
            isLoading={data.ageBreakdownLoading}
            embedded={false}
          />
        </div>
      );
    }

    if (key === "funnel") {
      return <VirtualFunnelPanel key={key} steps={insightPanels.funnelSteps} />;
    }

    if (key === "campaignObjectives") {
      return (
        <CampaignObjectivesPanel
          key={key}
          buckets={insightPanels.campaignStatus}
          objectiveBuckets={insightPanels.campaignObjectives}
        />
      );
    }

    if (key === "topCampaigns") {
      return (
        <TopCampaignsRow
          key={key}
          byRank={insightPanels.topCampaigns}
          bySpend={insightPanels.topCampaignsBySpend}
        />
      );
    }

    if (key === "profitByCampaign") {
      return <ProfitByCampaignPanel key={key} rows={insightPanels.profitByCampaign} />;
    }

    if (key === "adLibrary") {
      return (
        <AdLibraryInsightsPanel
          key={key}
          insights={data.adLibraryInsights}
          isLoading={data.adLibraryLoading}
        />
      );
    }

    return null;
  }

  let metricsBlockRendered = false;
  const metricsAnchorKey = sectionOrder.find(
    (key) => key === "heroKpis" || key === "secondaryMetrics"
  );

  const rowLayouts = data.dashboardLayout.sectionRowLayouts;

  function flushSectionGroups(pendingKeys: DashboardSectionKey[], rendered: ReactNode[]) {
    if (pendingKeys.length === 0) return;
    const groups = buildDashboardSectionGroups(pendingKeys, rowLayouts);
    for (const group of groups) {
      if (group.type === "single") {
        const section = renderSection(group.key);
        if (section) rendered.push(section);
        continue;
      }
      const children = group.keys
        .map((key) => ({ key, node: renderSection(key) }))
        .filter((item): item is { key: DashboardSectionKey; node: ReactElement } => item.node != null);
      if (children.length === 0) continue;
      rendered.push(
        <div
          key={group.rowId}
          className="flex w-full min-w-0 flex-col gap-[var(--app-section-gap)] lg:flex-row lg:items-stretch"
        >
          {children.map(({ key, node }) => (
            <div key={key} className="flex min-w-0 w-full flex-1 basis-0">
              {node}
            </div>
          ))}
        </div>
      );
    }
  }

  const dashboardSections: ReactNode[] = [];
  let pendingSectionKeys: DashboardSectionKey[] = [];

  for (const key of sectionOrder) {
    const isMetricsBlock = key === "heroKpis" || key === "secondaryMetrics";
    if (isMetricsBlock) {
      if (key !== metricsAnchorKey || metricsBlockRendered) continue;
      flushSectionGroups(pendingSectionKeys, dashboardSections);
      pendingSectionKeys = [];
      const section = renderSection(key);
      metricsBlockRendered = true;
      if (section) dashboardSections.push(<div key="metrics">{section}</div>);
      continue;
    }

    if (!sections[key] || data.isEmptyState) continue;
    pendingSectionKeys.push(key);
  }
  flushSectionGroups(pendingSectionKeys, dashboardSections);

  return (
    <div data-dashboard-shell className="contents">
    <AppPageShell as="main" className="flex-1 overflow-y-auto">
      <PageToolbar
        filterCreatorFields
        icon={<Sparkles size={16} />}
        title={t("highlights")}
        subtitle={
          <>
            <span>{t("highlightsSubtitle")}</span>
            {!data.isEmptyState ? (
              <ActiveScopeFilterBadges periodLabel={data.periodLabel} />
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
            <DsCard padding="lg" className="flex flex-col gap-3">
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
            </DsCard>
          </div>
        ) : (
          <div className="tab-transition animate-fade-up flex flex-col gap-[var(--app-section-gap)]">
            {dashboardSections}
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
    </div>
  );
}
