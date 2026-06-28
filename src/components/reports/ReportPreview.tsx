"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { CreativesRankingView } from "@/components/creatives/CreativesRankingView";
import { PieLegend } from "@/components/charts/PieLegend";
import { ReportAudienceBreakdown } from "@/components/reports/ReportAudienceBreakdown";
import { ReportKpiGrid } from "@/components/reports/ReportKpiGrid";
import type { ReportCreativeGroup } from "@/lib/report-creatives-performance";
import { ReportHighlightCard } from "@/components/reports/ReportHighlightCard";
import { Badge } from "@/components/ui/Badge";
import { ChartContainer } from "@/components/ui/ChartContainer";
import { formatDayLabel, pctDelta } from "@/lib/dashboard-ranges";
import { formatMetricValue, METRIC_BY_KEY, type MetricKey } from "@/lib/dashboard-metrics";
import { formatBRL, formatPercent, titleCaseWords } from "@/lib/format";
import type { ReportBreakdownLayoutItem } from "@/lib/report-breakdown-layout";
import type { ReportPreviewPayload } from "@/lib/report-preview-types";
import { Settings2 } from "lucide-react";

const COST_METRICS = new Set<MetricKey>(["spend", "cpc", "cpm", "cpa", "cpmsg"]);
const PIE_COLORS = ["#7c3aed", "#6366f1", "#10b981", "#ec4899", "#0ea5e9", "#8b5cf6", "#94a3b8"];

const GRID_STROKE = "var(--border-color)";
const TICK = { fill: "var(--text-dimmer)", fontSize: 10 };
const AXIS = { axisLine: false as const, tickLine: false as const };
const TOOLTIP_STYLE = {
  background: "var(--surface-card)",
  border: "1px solid var(--border-color)",
  borderRadius: 10,
  fontSize: 11,
  color: "var(--text-main)"
};

function ReportChartCard({
  title,
  solo = false,
  children
}: {
  title: string;
  solo?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`report-pdf-chart-card report-pdf-block campaign-creator-card overflow-hidden !p-4 ${solo ? "report-pdf-solo" : ""}`}
    >
      <div className="text-sm font-semibold text-[var(--text-main)]">{title}</div>
      <div className={`mt-3 ${solo ? "w-full" : ""}`}>{children}</div>
    </div>
  );
}

export function ReportPreview({
  data,
  selectedMetrics,
  kpiMetrics,
  kpiEditMode = false,
  onKpiEditModeChange,
  onKpiReorder,
  reportType,
  periodQuery,
  adAccountId,
  initialCreativeGroups,
  initialBreakdownLayout,
  variant = "preview"
}: {
  data: ReportPreviewPayload;
  selectedMetrics: MetricKey[];
  kpiMetrics?: MetricKey[];
  kpiEditMode?: boolean;
  onKpiEditModeChange?: (value: boolean) => void;
  onKpiReorder?: (order: MetricKey[]) => void;
  reportType: "simple" | "complete";
  periodQuery: string;
  adAccountId?: string;
  initialCreativeGroups?: ReportCreativeGroup[];
  initialBreakdownLayout?: ReportBreakdownLayoutItem[];
  variant?: "preview" | "print";
}) {
  const t = useTranslations("reports");
  const tMetrics = useTranslations("metrics");
  const tPresets = useTranslations("campaignPresets");
  const locale = useLocale();

  const spark = useMemo(
    () => data.series.map((p) => ({ ...p, label: formatDayLabel(p.day, locale) })),
    [data.series, locale]
  );

  const chartData = spark;
  const chartMetrics = selectedMetrics.slice(0, 3);
  const displayKpis = kpiMetrics ?? selectedMetrics.slice(0, 6);
  const vsLabel = t("vsPrevPeriod");
  const noPrev = t("noPrevData");

  function metricLegendLabel(key: MetricKey): string {
    return titleCaseWords(tMetrics(METRIC_BY_KEY[key].label));
  }

  function heroDelta(key: MetricKey): number | null {
    const prev = data.previousSummary?.[key];
    if (prev == null || prev <= 0) return null;
    return pctDelta(data.summary[key] ?? 0, prev);
  }

  const comparisonChartData = data.comparisonBars
    .filter((b) => selectedMetrics.includes(b.key) || b.key === data.client.goalMetric)
    .slice(0, 5)
    .map((b) => ({
      name: tMetrics(METRIC_BY_KEY[b.key].label),
      current: b.current,
      previous: b.previous
    }));

  const spendTrendData = useMemo(() => {
    const cur = data.series.map((p) => ({ label: formatDayLabel(p.day, locale), spend: p.spend ?? 0 }));
    const prev = data.previousSeries.map((p) => ({
      label: formatDayLabel(p.day, locale),
      spend: p.spend ?? 0
    }));
    const len = Math.max(cur.length, prev.length);
    return Array.from({ length: len }, (_, i) => ({
      label: cur[i]?.label ?? prev[i]?.label ?? `#${i + 1}`,
      current: cur[i]?.spend ?? 0,
      previous: prev[i]?.spend ?? 0
    }));
  }, [data.series, data.previousSeries, locale]);

  const pieData = data.campaigns
    .filter((c) => c.spend > 0)
    .slice(0, 7)
    .map((c) => ({ name: c.name, value: c.spend, share: c.sharePct }));

  const campaignsWithSpend = useMemo(
    () => data.campaigns.filter((c) => c.spend > 0),
    [data.campaigns]
  );

  const goalValue = data.summary[data.client.goalMetric] ?? 0;
  const prevGoal = data.previousSummary?.[data.client.goalMetric] ?? 0;
  const goalDelta = prevGoal > 0 ? pctDelta(goalValue, prevGoal) : null;
  const isPrint = variant === "print";
  const rootId = isPrint ? "report-print-root" : "report-preview-root";
  const rootClass = isPrint ? "report-print-root space-y-5" : "report-preview-root space-y-5";
  const sectionClass = isPrint ? "report-print-section report-pdf-section" : "report-pdf-section";

  return (
    <div id={rootId} className={`${rootClass} overflow-visible`}>
      <div className={`report-pdf-header flex flex-wrap items-start justify-between gap-3 border-b border-[var(--creator-card-border,var(--border-color))] pb-4 ${isPrint ? "report-print-avoid-break" : ""}`}>
        <div>
          <div className="text-xs font-medium text-[var(--text-dim)]">
            {isPrint ? t("printTitle") : t("previewTitle")}
          </div>
          <h2 className="font-heading mt-1 text-xl font-bold text-[var(--text-main)]">{data.client.name}</h2>
          <p className="mt-1 text-sm text-[var(--text-dim)]">
            {data.period.currentLabel}
            <span className="mx-2 text-[var(--text-dimmer)]">·</span>
            {reportType === "complete" ? t("typeComplete") : t("typeSimple")}
            {data.adAccount?.label ? (
              <>
                <span className="mx-2 text-[var(--text-dimmer)]">·</span>
                {data.adAccount.label}
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="brand">{tPresets(data.client.dominantPreset)}</Badge>
          <Badge variant="neutral">
            {t("compareWith")} {data.period.previousLabel}
          </Badge>
        </div>
      </div>

      <section className={`${sectionClass}`}>
        {!isPrint && onKpiEditModeChange ? (
          <div className="no-print mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-[var(--text-dim)]">
              {kpiEditMode ? t("kpiCustomizeHint") : null}
            </p>
            <button
              type="button"
              onClick={() => onKpiEditModeChange(!kpiEditMode)}
              className="ui-btn-secondary inline-flex items-center gap-2 text-xs"
            >
              <Settings2 size={14} />
              {kpiEditMode ? t("kpiCustomizeDone") : t("kpiCustomize")}
            </button>
          </div>
        ) : null}
        <ReportKpiGrid
          metrics={displayKpis}
          editMode={!isPrint && kpiEditMode}
          onReorder={(order) => onKpiReorder?.(order)}
          renderCard={(key) => (
            <ReportHighlightCard
              id={key}
              label={tMetrics(METRIC_BY_KEY[key].label)}
              value={formatMetricValue(key, data.summary[key] ?? 0, locale)}
              delta={heroDelta(key)}
              goodWhen={COST_METRICS.has(key) ? "neutral" : "up"}
              data={spark}
              dataKey={key}
              color={METRIC_BY_KEY[key].color}
              vsLabel={vsLabel}
              noPrevLabel={noPrev}
              locale={locale}
            />
          )}
        />
      </section>

      <section className={`${sectionClass} campaign-creator-card overflow-hidden !p-4 report-print-avoid-break`}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-semibold text-[var(--text-main)]">{t("narrativeTitle")}</div>
          {data.aiAnalysis ? (
            <Badge variant="brand">{t("claudeAnalysisBadge")}</Badge>
          ) : reportType === "complete" ? (
            <Badge variant="neutral">{t("claudeAnalysisFallback")}</Badge>
          ) : null}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-dim)]">{data.narrative}</p>
        {data.aiAnalysis?.keyFindings.length ? (
          <ul className="mt-4 space-y-2 border-t border-[var(--creator-card-border,var(--border-color))] pt-4">
            {data.aiAnalysis.keyFindings.map((item, i) => (
              <li key={i} className="text-sm text-[var(--text-dim)]">
                <span className="mr-1.5 text-[var(--ui-accent)]">•</span>
                {item}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className={`${sectionClass} report-pdf-grid-2 grid grid-cols-1 gap-3 lg:grid-cols-2`}>
        <ReportChartCard title={t("performanceChartTitle")}>
          <div className="mt-3 h-56">
            <ChartContainer height={224}>
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="label" tick={TICK} {...AXIS} />
                <YAxis tick={TICK} {...AXIS} width={48} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value, _name, item) => {
                    const key = String((item as { dataKey?: string })?.dataKey ?? "") as MetricKey;
                    return [
                      formatMetricValue(key, Number(value), locale),
                      metricLegendLabel(key)
                    ];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-dim)" }} />
                {chartMetrics.map((key) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={metricLegendLabel(key)}
                    stroke={METRIC_BY_KEY[key].color}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ChartContainer>
          </div>
        </ReportChartCard>

        <ReportChartCard title={t("comparisonBarsTitle")}>
          <div className="mt-3 h-56">
            <ChartContainer height={224}>
              <BarChart data={comparisonChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="name" tick={TICK} {...AXIS} />
                <YAxis tick={TICK} {...AXIS} width={48} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-dim)" }} />
                <Bar dataKey="current" name={t("periodCurrent")} fill="var(--ui-accent)" radius={[4, 4, 0, 0]} />
                <Bar
                  dataKey="previous"
                  name={t("periodPrevious")}
                  fill="var(--text-dimmer)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </div>
        </ReportChartCard>
      </section>

      <section className={`${sectionClass} report-pdf-block campaign-creator-card overflow-hidden !p-4`}>
        <div className="text-sm font-semibold text-[var(--text-main)] report-print-avoid-break">
          {t("spendByCampaignTitle")}
        </div>
        {campaignsWithSpend.length ? (
          <div
            className={`report-pdf-spend-layout mt-4 grid grid-cols-1 gap-6 ${
              isPrint ? "" : "xl:grid-cols-[minmax(280px,1fr)_minmax(0,1.4fr)]"
            }`}
          >
            <div className={`flex min-w-0 flex-col ${isPrint ? "report-print-avoid-break" : ""}`}>
              <div className="report-pdf-spend-pie mx-auto w-full max-w-[360px]">
                <div className="h-80">
                  <ChartContainer height={320}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={108}
                        paddingAngle={2}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, _name, item) => {
                          const share = (item?.payload as { share?: number } | undefined)?.share;
                          const shareLabel =
                            share != null ? ` (${formatPercent(share, 1, locale)})` : "";
                          return [`${formatBRL(Number(value ?? 0), locale)}${shareLabel}`, t("spend")];
                        }}
                        contentStyle={TOOLTIP_STYLE}
                      />
                    </PieChart>
                  </ChartContainer>
                </div>
                <PieLegend
                  items={pieData.map((item, i) => ({
                    name: item.name,
                    color: PIE_COLORS[i % PIE_COLORS.length]
                  }))}
                />
              </div>
            </div>

            <div className={`min-w-0 ${isPrint ? "report-print-table-section" : ""}`}>
              <div className="mb-2 text-xs font-medium text-[var(--text-dim)]">
                {t("campaignSpendTableTitle", { count: campaignsWithSpend.length })}
              </div>
              <div
                className={`campaign-creator-sidebar-card-inset ${
                  isPrint ? "report-print-table-wrap" : "overflow-x-auto"
                }`}
              >
                <table
                  className={`w-full text-left text-xs ${isPrint ? "report-print-table" : "min-w-[420px]"}`}
                >
                  <thead>
                    <tr className="border-b border-[var(--creator-card-border,var(--border-color))] bg-[var(--creator-card-bg-inset,var(--surface-bg))]">
                      <th className="px-3 py-2.5 font-semibold text-[var(--text-dim)]">{t("colCampaign")}</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-[var(--text-dim)]">{t("spend")}</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-[var(--text-dim)]">
                        {t("colShare")}
                      </th>
                      <th className="px-3 py-2.5 text-right font-semibold text-[var(--text-dim)]">
                        {tMetrics(METRIC_BY_KEY.conversions.label)}
                      </th>
                      <th className="px-3 py-2.5 text-right font-semibold text-[var(--text-dim)]">
                        {tMetrics(METRIC_BY_KEY.clicks.label)}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaignsWithSpend.map((row) => (
                      <tr
                        key={row.metaCampaignId}
                        className="border-b border-[var(--creator-card-border,var(--border-color))] last:border-b-0"
                      >
                        <td className="max-w-[220px] truncate px-3 py-2.5 font-medium text-[var(--text-main)]">
                          {row.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right text-[var(--text-main)]">
                          {formatBRL(row.spend, locale)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right text-[var(--text-dim)]">
                          {formatPercent(row.sharePct, 1, locale)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right text-[var(--text-dim)]">
                          {formatMetricValue("conversions", row.conversions, locale)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right text-[var(--text-dim)]">
                          {formatMetricValue("clicks", row.clicks, locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[var(--creator-card-bg-inset,var(--surface-bg))] font-semibold">
                      <td className="px-3 py-2.5 text-[var(--text-main)]">{t("campaignSpendTotal")}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right text-[var(--text-main)]">
                        {formatBRL(data.summary.spend ?? 0, locale)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-[var(--text-dim)]">100%</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right text-[var(--text-dim)]">
                        {formatMetricValue("conversions", data.summary.conversions ?? 0, locale)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right text-[var(--text-dim)]">
                        {formatMetricValue("clicks", data.summary.clicks ?? 0, locale)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-6 text-center text-sm text-[var(--text-dim)]">{t("noCampaignData")}</p>
        )}
      </section>

      {data.breakdowns?.length ? (
        <ReportAudienceBreakdown
          sections={data.breakdowns}
          locale={locale}
          isPrint={isPrint}
          initialLayout={initialBreakdownLayout}
        />
      ) : null}

      <section className={`${sectionClass} report-pdf-block campaign-creator-card overflow-hidden !p-4 report-print-avoid-break`}>
        <div className="text-sm font-semibold text-[var(--text-main)]">{t("goalResultsTitle")}</div>
        <div className="report-pdf-grid-3 mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] p-4">
            <div className="text-xs font-medium text-[var(--ui-accent)]">{t("goalPrimary")}</div>
            <div className="font-heading mt-1 text-2xl font-bold text-[var(--text-main)]">
              {formatMetricValue(data.client.goalMetric, goalValue, locale)}
            </div>
            <div className="mt-1 text-xs text-[var(--text-dim)]">
              {tMetrics(METRIC_BY_KEY[data.client.goalMetric].label)}
            </div>
          </div>
          <div className="campaign-creator-sidebar-card-inset p-4">
            <div className="text-xs font-medium text-[var(--text-dim)]">{t("goalPrevious")}</div>
            <div className="font-heading mt-1 text-2xl font-bold text-[var(--text-main)]">
              {prevGoal > 0 ? formatMetricValue(data.client.goalMetric, prevGoal, locale) : "—"}
            </div>
          </div>
          <div className="campaign-creator-sidebar-card-inset p-4">
            <div className="text-xs font-medium text-[var(--text-dim)]">{t("goalChange")}</div>
            <div
              className="font-heading mt-1 text-2xl font-bold"
              style={{
                color:
                  goalDelta === null
                    ? "var(--text-main)"
                    : goalDelta >= 0
                      ? "var(--success)"
                      : "var(--danger)"
              }}
            >
              {goalDelta !== null ? formatPercent(goalDelta, 1, locale) : "—"}
            </div>
          </div>
        </div>
      </section>

      <section className={`${sectionClass}`}>
        <ReportChartCard title={t("spendTrendCompareTitle")} solo>
          <div className="mt-3 h-56">
            <ChartContainer height={224}>
              <LineChart data={spendTrendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="label" tick={TICK} {...AXIS} />
                <YAxis tick={TICK} {...AXIS} width={48} />
                <Tooltip
                  formatter={(value) => [formatBRL(Number(value), locale), ""]}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-dim)" }} />
                <Line
                  type="monotone"
                  dataKey="current"
                  name={t("periodCurrent")}
                  stroke="var(--ui-accent)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="previous"
                  name={t("periodPrevious")}
                  stroke="var(--text-dimmer)"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="4 4"
                />
              </LineChart>
            </ChartContainer>
          </div>
        </ReportChartCard>
      </section>

      {reportType === "complete" && data.recommendations.length ? (
        <section className={`${sectionClass} report-pdf-block campaign-creator-card !p-4 report-print-avoid-break`}>
          <div className="text-sm font-semibold text-[var(--text-main)]">{t("recommendationsTitle")}</div>
          <p className="mt-1 text-xs text-[var(--text-dim)]">{t("recommendationsSubtitle")}</p>
          <div className="mt-4 space-y-3">
            {data.recommendations.map((rec) => (
              <div
                key={rec.id}
                className={`rounded-xl border p-4 ${
                  rec.priority === "high"
                    ? "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.06)]"
                    : rec.priority === "medium"
                      ? "border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)]"
                      : "border-[var(--creator-card-border,var(--border-color))] bg-[var(--creator-card-bg-inset,var(--surface-bg))]"
                }`}
              >
                <div className="text-sm font-semibold text-[var(--text-main)]">{rec.title}</div>
                <p className="mt-1 text-sm text-[var(--text-dim)]">{rec.body}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className={`${sectionClass}`}>
        <div className="mb-3">
          <div className="text-sm font-semibold text-[var(--text-main)]">{t("creativesRankingTitle")}</div>
          <p className="mt-1 text-xs text-[var(--text-dim)]">{t("creativesRankingSubtitle")}</p>
        </div>
        <CreativesRankingView
          clientId={data.client.id}
          clientSlug={data.client.slug}
          periodQuery={periodQuery}
          adAccountId={adAccountId ?? data.adAccount?.metaAdAccountId}
          maxBest={3}
          embedInReport
          initialGroups={initialCreativeGroups}
        />
      </section>
    </div>
  );
}
