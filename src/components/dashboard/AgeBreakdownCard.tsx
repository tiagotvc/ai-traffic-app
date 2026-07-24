"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from "recharts";

import { PremiumChartFrame } from "@/components/charts/PremiumChartFrame";
import { ChartContainer } from "@/components/ui/ChartContainer";
import { premiumAxisTick, premiumGridProps } from "@/lib/dashboard/premium-chart-theme";
import { formatBRL, formatNumber, formatPercent } from "@/lib/format";
import type { AgeBreakdownRow } from "@/lib/dashboard-age-breakdown";

type Dimension = "age" | "gender";
type ChartRow = AgeBreakdownRow & { label: string };

const AGE_SEGMENTS = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"] as const;
const AGE_SEGMENT_COLORS: Record<string, string> = {
  "18-24": "#f5a623",
  "25-34": "#7c3aed",
  "35-44": "#10b981",
  "45-54": "#1e40af",
  "55-64": "#ec4899",
  "65+": "#38bdf8"
};
const GENDER_SEGMENTS = ["male", "female", "unknown"] as const;
const GENDER_SEGMENT_COLORS: Record<string, string> = {
  male: "#3b82f6",
  female: "#ec4899",
  unknown: "#94a3b8"
};

function DemoTooltip({
  active,
  payload,
  locale
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartRow }>;
  locale: string;
}) {
  if (!active || !payload?.[0]?.payload) return null;
  const row = payload[0].payload;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-lg"
      style={{
        background: "var(--surface-card)",
        borderColor: "var(--border-color)",
        color: "var(--text-main)"
      }}
    >
      <p className="font-semibold">{row.label}</p>
      <p style={{ color: "var(--text-dim)" }}>{formatBRL(row.spend, locale)}</p>
      <p style={{ color: "var(--text-dimmer)" }}>
        {formatPercent(row.sharePct, 1, locale)} · {formatNumber(row.conversions, locale)} conv.
      </p>
    </div>
  );
}

export function AgeBreakdownCard({
  rows,
  genderRows,
  isLoading,
  genderLoading,
  embedded = false
}: {
  rows: AgeBreakdownRow[];
  genderRows?: AgeBreakdownRow[];
  isLoading?: boolean;
  genderLoading?: boolean;
  embedded?: boolean;
}) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const [dimension, setDimension] = useState<Dimension>("age");

  const activeRows = dimension === "gender" ? genderRows ?? [] : rows;
  const loading = dimension === "gender" ? genderLoading : isLoading;

  const segLabel = (segment: string): string =>
    dimension === "gender"
      ? t(segment === "male" ? "genderMale" : segment === "female" ? "genderFemale" : "genderUnknown")
      : segment;

  const chartRows: ChartRow[] = activeRows
    .filter((r) => r.spend > 0)
    .map((r) => ({ ...r, label: segLabel(r.segment) }));
  const hasData = chartRows.length > 0;

  const placeholderSegs = dimension === "gender" ? GENDER_SEGMENTS : AGE_SEGMENTS;
  const placeholderColors = dimension === "gender" ? GENDER_SEGMENT_COLORS : AGE_SEGMENT_COLORS;
  const placeholderRows = placeholderSegs.map((segment, i) => ({
    segment,
    label: segLabel(segment),
    spend: 1000 + i * 250,
    sharePct: 100 / placeholderSegs.length,
    conversions: 0,
    cpa: null as number | null,
    color: placeholderColors[segment] ?? "#94a3b8"
  }));

  const displayChartRows = hasData ? chartRows : placeholderRows;
  const tableRows = hasData ? activeRows.filter((r) => r.spend > 0 || r.conversions > 0) : activeRows;

  return (
    <section
      className={
        embedded
          ? "h-full min-h-0 w-full"
          : "campaign-creator-card campaign-creator-card--compact flex h-full min-h-0 w-full flex-col"
      }
      aria-labelledby="age-breakdown-title"
    >
      <div className="mb-2 flex shrink-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <h3
            id="age-breakdown-title"
            className="font-heading text-sm font-semibold text-[var(--text-main)]"
          >
            {t(dimension === "gender" ? "genderBreakdownTitle" : "ageBreakdownTitle")}
          </h3>
          <p className="mt-0.5 text-[10px]" style={{ color: "var(--text-dimmer)" }}>
            {t("ageBreakdownSubtitle")}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          {(["age", "gender"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDimension(d)}
              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition active:scale-95 ${
                dimension === d
                  ? "border-[var(--ui-accent)] font-semibold text-[var(--ui-accent)]"
                  : "border-[var(--border-color)] text-[var(--text-dim)] hover:border-[var(--ui-accent)] hover:text-[var(--text-main)]"
              }`}
            >
              {t(d === "age" ? "demoToggleAge" : "demoToggleGender")}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="skeleton-shimmer h-[160px] rounded-lg" />
          <div className="skeleton-shimmer h-20 rounded-lg" />
        </div>
      ) : (
        <>
          <ChartContainer height={Math.max(140, displayChartRows.length * 28 + 16)} className="mb-3 w-full">
            <PremiumChartFrame compact>
              <BarChart
                data={displayChartRows}
                layout="vertical"
                margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
              >
                <CartesianGrid {...premiumGridProps()} horizontal={false} />
                <XAxis
                  type="number"
                  tick={premiumAxisTick()}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => (hasData ? formatBRL(Number(v), locale) : "")}
                  domain={hasData ? undefined : [0, 2500]}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={64}
                  tick={{ ...premiumAxisTick(), fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                {hasData ? (
                  <Tooltip
                    cursor={{ fill: "rgba(124,58,237,0.06)" }}
                    content={<DemoTooltip locale={locale} />}
                  />
                ) : null}
                <Bar dataKey="spend" radius={[0, 4, 4, 0]} maxBarSize={18} opacity={hasData ? 1 : 0.35}>
                  {displayChartRows.map((row) => (
                    <Cell key={row.segment} fill={row.color} />
                  ))}
                </Bar>
              </BarChart>
            </PremiumChartFrame>
          </ChartContainer>

          {!hasData ? (
            <p
              className="mb-3 rounded-lg border px-3 py-2 text-center text-[11px]"
              style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
            >
              {t("ageBreakdownEmpty")}
            </p>
          ) : null}

          <div className="min-w-0 overflow-x-auto">
            <table className="w-full text-left text-[10px]">
              <thead>
                <tr className="text-[var(--text-main)]">
                  <th className="pb-1.5 pr-2 font-semibold uppercase tracking-wide">{t("ageBreakdownColSegment")}</th>
                  <th className="pb-1.5 pr-2 text-right font-semibold uppercase tracking-wide">{t("ageBreakdownColSpend")}</th>
                  <th className="pb-1.5 pr-2 text-right font-semibold uppercase tracking-wide">{t("ageBreakdownColShare")}</th>
                  <th className="pb-1.5 pr-2 text-right font-semibold uppercase tracking-wide">{t("ageBreakdownColConversions")}</th>
                  <th className="pb-1.5 text-right font-semibold uppercase tracking-wide">{t("ageBreakdownColCpa")}</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr
                    key={row.segment}
                    className="border-t border-[var(--creator-card-border,var(--border-color))]"
                    style={{ color: "var(--text-main)" }}
                  >
                    <td className="py-1.5 pr-2 font-medium">{segLabel(row.segment)}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">
                      {row.spend > 0 ? formatBRL(row.spend, locale) : "—"}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">
                      {row.spend > 0 ? formatPercent(row.sharePct, 1, locale) : "—"}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">
                      {row.conversions > 0 ? formatNumber(row.conversions, locale) : "—"}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {row.cpa != null && row.conversions > 0 ? formatBRL(row.cpa, locale) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
