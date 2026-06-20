"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
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
import { ReportHighlightCard } from "@/components/reports/ReportHighlightCard";
import { Badge } from "@/components/ui/Badge";
import { ChartContainer } from "@/components/ui/ChartContainer";
import { formatDayLabel, pctDelta } from "@/lib/dashboard-ranges";
import { formatMetricValue, METRIC_BY_KEY, type MetricKey } from "@/lib/dashboard-metrics";
import { formatBRL, formatPercent } from "@/lib/format";
import type { ReportPreviewPayload } from "@/lib/report-preview-types";

const COST_METRICS = new Set<MetricKey>(["spend", "cpc", "cpm", "cpa", "cpmsg"]);
const PIE_COLORS = ["#7c3aed", "#6366f1", "#14b8a6", "#f59e0b", "#ec4899", "#0ea5e9", "#94a3b8"];

export function ReportPreview({
  data,
  selectedMetrics,
  reportType,
  periodQuery
}: {
  data: ReportPreviewPayload;
  selectedMetrics: MetricKey[];
  reportType: "simple" | "complete";
  periodQuery: string;
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
  const vsLabel = t("vsPrevPeriod");
  const noPrev = t("noPrevData");

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

  const goalValue = data.summary[data.client.goalMetric] ?? 0;
  const prevGoal = data.previousSummary?.[data.client.goalMetric] ?? 0;
  const goalDelta = prevGoal > 0 ? pctDelta(goalValue, prevGoal) : null;

  return (
    <div id="report-preview-root" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="text-xs font-medium text-slate-500">{t("previewTitle")}</div>
          <h2 className="mt-1 text-xl font-bold text-slate-900">{data.client.name}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {data.period.currentLabel}
            <span className="mx-2 text-slate-300">·</span>
            {reportType === "complete" ? t("typeComplete") : t("typeSimple")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="brand">{tPresets(data.client.dominantPreset)}</Badge>
          <Badge variant="neutral">{t("compareWith")} {data.period.previousLabel}</Badge>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {selectedMetrics.slice(0, 6).map((key) => (
          <ReportHighlightCard
            key={key}
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
        ))}
      </section>

      <section className="ui-card p-4">
        <div className="text-sm font-semibold text-slate-900">{t("narrativeTitle")}</div>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">{data.narrative}</p>
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="ui-card p-4">
          <div className="text-sm font-semibold text-slate-900">{t("performanceChartTitle")}</div>
          <div className="mt-3 h-56">
            <ChartContainer height={224}>
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" width={48} />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    fontSize: 11
                  }}
                  formatter={(value, name) => [
                    formatMetricValue(String(name) as MetricKey, Number(value), locale),
                    tMetrics(METRIC_BY_KEY[String(name) as MetricKey]?.label ?? "spend")
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {chartMetrics.map((key) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={key}
                    stroke={METRIC_BY_KEY[key].color}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ChartContainer>
          </div>
        </div>

        <div className="ui-card p-4">
          <div className="text-sm font-semibold text-slate-900">{t("spendByCampaignTitle")}</div>
          {pieData.length ? (
            <div className="mt-3 h-56">
              <ChartContainer height={224}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [formatBRL(Number(value ?? 0), locale), t("spend")]}
                    contentStyle={{ fontSize: 11, borderRadius: 10 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ChartContainer>
            </div>
          ) : (
            <p className="mt-6 text-center text-sm text-slate-500">{t("noCampaignData")}</p>
          )}
        </div>
      </section>

      <section className="ui-card p-4">
        <div className="text-sm font-semibold text-slate-900">{t("goalResultsTitle")}</div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-violet-50 p-4">
            <div className="text-xs font-medium text-violet-700">{t("goalPrimary")}</div>
            <div className="mt-1 text-2xl font-bold text-violet-900">
              {formatMetricValue(data.client.goalMetric, goalValue, locale)}
            </div>
            <div className="mt-1 text-xs text-violet-600">
              {tMetrics(METRIC_BY_KEY[data.client.goalMetric].label)}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-xs font-medium text-slate-600">{t("goalPrevious")}</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {prevGoal > 0 ? formatMetricValue(data.client.goalMetric, prevGoal, locale) : "—"}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-xs font-medium text-slate-600">{t("goalChange")}</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {goalDelta !== null ? formatPercent(goalDelta, 1, locale) : "—"}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="ui-card p-4">
          <div className="text-sm font-semibold text-slate-900">{t("comparisonBarsTitle")}</div>
          <div className="mt-3 h-56">
            <ChartContainer height={224}>
              <BarChart data={comparisonChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" width={48} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="current" name={t("periodCurrent")} fill="#7c3aed" radius={[4, 4, 0, 0]} />
                <Bar dataKey="previous" name={t("periodPrevious")} fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
        </div>

        <div className="ui-card p-4">
          <div className="text-sm font-semibold text-slate-900">{t("spendTrendCompareTitle")}</div>
          <div className="mt-3 h-56">
            <ChartContainer height={224}>
              <LineChart data={spendTrendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" width={48} />
                <Tooltip
                  formatter={(value) => [formatBRL(Number(value), locale), ""]}
                  contentStyle={{ fontSize: 11, borderRadius: 10 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="current"
                  name={t("periodCurrent")}
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="previous"
                  name={t("periodPrevious")}
                  stroke="#94a3b8"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="4 4"
                />
              </LineChart>
            </ChartContainer>
          </div>
        </div>
      </section>

      {reportType === "complete" && data.recommendations.length ? (
        <section className="ui-card p-4">
          <div className="text-sm font-semibold text-slate-900">{t("recommendationsTitle")}</div>
          <p className="mt-1 text-xs text-slate-500">{t("recommendationsSubtitle")}</p>
          <div className="mt-4 space-y-3">
            {data.recommendations.map((rec) => (
              <div
                key={rec.id}
                className={`rounded-xl border p-4 ${
                  rec.priority === "high"
                    ? "border-rose-200 bg-rose-50/50"
                    : rec.priority === "medium"
                      ? "border-amber-200 bg-amber-50/50"
                      : "border-slate-200 bg-slate-50/50"
                }`}
              >
                <div className="text-sm font-semibold text-slate-900">{rec.title}</div>
                <p className="mt-1 text-sm text-slate-600">{rec.body}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-3">
          <div className="text-sm font-semibold text-slate-900">{t("creativesRankingTitle")}</div>
          <p className="mt-1 text-xs text-slate-500">{t("creativesRankingSubtitle")}</p>
        </div>
        <CreativesRankingView
          clientId={data.client.id}
          clientSlug={data.client.slug}
          periodQuery={periodQuery}
        />
      </section>
    </div>
  );
}
