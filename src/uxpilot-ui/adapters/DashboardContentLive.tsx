"use client";

import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";

import { AgencyHealthLayout } from "@/components/dashboard/AgencyHealthLayout";
import { BrainShelf } from "@/components/dashboard/BrainShelf";
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

  const summary = data.summary ?? {};
  const { primaryKPIs, secondaryMetrics } = toMetricPrismProps({
    summary,
    prevSummary: data.prevSummary,
    series: data.series,
    dominantPreset: data.dominantPreset,
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
  const agencyHealth = toAgencyHealth({ clients: data.clients, locale: data.locale });
  const brainItems = toBrainShelfLearnings(data.brainLearnings);

  return (
    <main
      className="flex-1 space-y-4 overflow-y-auto px-4 py-5 md:px-6"
      style={{ scrollbarWidth: "thin", scrollbarColor: "var(--scrollbar-color) transparent" }}
    >
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

      {data.note ? <div className="ui-alert-info">{data.note}</div> : null}

      {!data.isEmptyState ? (
        <div
          className="rounded-xl border px-3 py-2.5"
          style={{
            background: "var(--surface-card)",
            borderColor: "rgba(124,58,237,0.18)",
            boxShadow: "0 1px 6px rgba(124,58,237,0.06)"
          }}
        >
          <BrainShelf
            suggestions={brainItems}
            isLoading={data.brainLearningsLoading}
            compact
          />
        </div>
      ) : null}

      <div className="tab-transition animate-fade-up space-y-5">
        <MetricPrism
          primaryKPIs={primaryKPIs}
          secondaryMetrics={secondaryMetrics}
          isLoading={data.loading}
        />

        {!data.loading && data.isEmptyState ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ConnectAccountCard />
            <div
              className="flex flex-col gap-4 rounded-2xl border p-6"
              style={{ background: "var(--surface-card)", border: "1px solid var(--border-color)" }}
            >
              <h3 className="font-heading font-semibold" style={{ color: "var(--text-main)" }}>
                O que você verá aqui
              </h3>
              {[
                "Métricas em tempo real de todas as contas",
                "Sugestões de IA para otimização de campanhas",
                "Alertas automáticos de anomalias",
                "Relatórios consolidados por cliente",
                "Projeções de ROAS e CPL com ML"
              ].map((item, i) => (
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

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_280px]">
          <div
            className="rounded-2xl p-5"
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--border-color)",
              boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
              minHeight: "360px"
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

          <div
            className="rounded-2xl p-4"
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--border-color)",
              boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
              minHeight: "360px"
            }}
          >
            <LiveIntelligenceFeed events={intelligenceEvents} isLoading={data.loading} />
          </div>
        </div>

        <AgencyHealthLayout
          healthMetrics={agencyHealth.healthMetrics}
          clients={agencyHealth.clients}
          isLoading={data.loading}
        />
      </div>
    </main>
  );
}
