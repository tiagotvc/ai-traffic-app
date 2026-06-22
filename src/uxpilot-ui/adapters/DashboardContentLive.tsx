"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Settings2, Sparkles } from "lucide-react";

import { AgencyHealthLayout } from "@/components/dashboard/AgencyHealthLayout";
import { Link } from "@/i18n/navigation";
import { BrainSummaryBanner } from "@/components/dashboard/BrainSummaryBanner";
import { DashboardCustomizeModal } from "@/components/dashboard/DashboardCustomizeModal";
import { DashboardPerformanceChart } from "@/components/dashboard/DashboardPerformanceChart";
import { LiveIntelligenceFeed } from "@/components/dashboard/LiveIntelligenceFeed";
import { MetricPrism } from "@/components/dashboard/MetricPrism";
import ConnectAccountCard from "@/uxpilot-ui/components/ConnectAccountCard";
import {
  toAgencyHealth,
  toBrainShelfLearnings,
  toChartData,
  toIntelligenceEvents,
  toMetricPrismProps
} from "@/uxpilot-ui/adapters/dashboard-mappers";
import { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";

export function DashboardContentLive() {
  const t = useTranslations("dashboard");
  const data = useDashboardData();
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const summary = data.summary ?? {};
  const sections = data.dashboardLayout.sections;
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
  const intelligenceEvents = toIntelligenceEvents({
    variations: data.variations,
    criticalAlerts: data.criticalAlerts,
    metricLabel: data.metricLabel,
    vsLabel: data.vsLabel,
    nowLabel: t("now"),
    recentLabel: t("recently")
  });
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
  const brainItems = toBrainShelfLearnings(data.brainLearnings);
  const emptyStateItems = [
    t("emptyStateItem1"),
    t("emptyStateItem2"),
    t("emptyStateItem3"),
    t("emptyStateItem4"),
    t("emptyStateItem5")
  ];

  return (
    <main
      className="flex-1 space-y-4 overflow-y-auto px-4 py-5 md:px-6"
      style={{ scrollbarWidth: "thin", scrollbarColor: "var(--scrollbar-color) transparent" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: "rgba(245,166,35,0.15)" }}
            >
              <Sparkles size={16} style={{ color: "#f5a623" }} />
            </div>
            <h1 className="font-heading text-xl font-bold md:text-xl" style={{ color: "var(--text-main)" }}>
              {t("highlights")}
            </h1>
          </div>
          <p className="mt-1 text-xs font-body" style={{ color: "var(--text-dim)" }}>
            {t("highlightsSubtitle")}
          </p>
        </div>
        {!data.isEmptyState ? (
          <button
            type="button"
            onClick={() => setCustomizeOpen(true)}
            className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:bg-[var(--surface-bg)]"
            style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
          >
            <Settings2 size={14} />
            {t("layoutCustomize")}
          </button>
        ) : null}
      </div>

      {data.note ? <div className="ui-alert-info">{data.note}</div> : null}

      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3"
        style={{
          background: "rgba(79,70,229,0.06)",
          borderColor: "rgba(79,70,229,0.18)"
        }}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
            {t("canvasUpsellTitle")}
          </p>
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>
            {t("canvasUpsellHint")}
          </p>
        </div>
        <Link
          href="/pricing"
          className="flex items-center gap-1 text-xs font-semibold"
          style={{ color: "#818cf8" }}
        >
          {t("canvasUpsellCta")}
          <ArrowRight size={12} />
        </Link>
      </div>

      {!data.isEmptyState && sections.brainShelf ? (
        <BrainSummaryBanner
          learningsCount={data.brainLearningsCount ?? brainItems.length}
          hypothesesCount={data.brainHypothesesCount ?? 0}
          isLoading={data.brainSummaryLoading ?? data.brainLearningsLoading}
        />
      ) : null}

      <div className="tab-transition animate-fade-up space-y-5">
        {(sections.heroKpis || sections.secondaryMetrics) && !data.isEmptyState ? (
          <MetricPrism
            primaryKPIs={sections.heroKpis ? primaryKPIs : []}
            secondaryMetrics={sections.secondaryMetrics ? secondaryMetrics : []}
            isLoading={data.loading}
          />
        ) : null}

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
        ) : null}

        {(sections.chart || sections.alerts) && !data.isEmptyState ? (
          <div
            className={
              sections.chart && sections.alerts
                ? "grid grid-cols-1 gap-4 xl:grid-cols-[1fr_280px]"
                : "grid grid-cols-1 gap-4"
            }
          >
            {sections.chart ? (
              <div
                className="rounded-2xl p-5"
                style={{
                  background: "var(--surface-card)",
                  border: "1px solid var(--border-color)",
                  boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
                  minHeight: sections.alerts ? "360px" : undefined
                }}
              >
                <DashboardPerformanceChart
                  data={chartData}
                  activeMetrics={data.chartMetrics}
                  onToggleMetric={data.toggleChartMetric}
                  formatValue={data.formatMetricValue}
                  metricLabels={data.chartMetricLabels}
                  isLoading={data.loading}
                  subtitle={data.vsLabel}
                />
              </div>
            ) : null}

            {sections.alerts ? (
              <div
                className="rounded-2xl p-4"
                style={{
                  background: "var(--surface-card)",
                  border: "1px solid var(--border-color)",
                  boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
                  minHeight: sections.chart ? "360px" : undefined
                }}
              >
                <LiveIntelligenceFeed events={intelligenceEvents} isLoading={data.loading} />
              </div>
            ) : null}
          </div>
        ) : null}

        {sections.agencyHealth && !data.isEmptyState ? (
          <AgencyHealthLayout
            healthMetrics={agencyHealth.healthMetrics}
            clients={agencyHealth.clients}
            isLoading={data.loading}
          />
        ) : null}
      </div>

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
    </main>
  );
}
