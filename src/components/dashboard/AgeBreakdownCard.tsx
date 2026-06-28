"use client";

import { useLocale, useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from "recharts";

import { PremiumChartFrame } from "@/components/charts/PremiumChartFrame";
import { ChartContainer } from "@/components/ui/ChartContainer";
import { premiumAxisTick, premiumGridProps } from "@/lib/dashboard/premium-chart-theme";
import { formatBRL, formatNumber, formatPercent } from "@/lib/format";
import type { AgeBreakdownRow } from "@/lib/dashboard-age-breakdown";

const AGE_SEGMENTS = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"] as const;

const AGE_SEGMENT_COLORS: Record<string, string> = {
  "18-24": "#f5a623",
  "25-34": "#7c3aed",
  "35-44": "#10b981",
  "45-54": "#1e40af",
  "55-64": "#ec4899",
  "65+": "#38bdf8"
};

function AgeTooltip({
  active,
  payload,
  locale
}: {
  active?: boolean;
  payload?: Array<{ payload: AgeBreakdownRow }>;
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
      <p className="font-semibold">{row.segment}</p>
      <p style={{ color: "var(--text-dim)" }}>{formatBRL(row.spend, locale)}</p>
      <p style={{ color: "var(--text-dimmer)" }}>
        {formatPercent(row.sharePct, 1, locale)} · {formatNumber(row.conversions, locale)} conv.
      </p>
    </div>
  );
}

export function AgeBreakdownCard({
  rows,
  isLoading,
  embedded = false
}: {
  rows: AgeBreakdownRow[];
  isLoading?: boolean;
  embedded?: boolean;
}) {
  const t = useTranslations("dashboard");
  const locale = useLocale();

  const chartRows = rows
    .filter((r) => r.spend > 0)
    .map((r) => ({ ...r, label: r.segment }));

  const hasData = chartRows.length > 0;

  const placeholderRows = AGE_SEGMENTS.map((segment) => ({
    segment,
    label: segment,
    spend: 1000 + AGE_SEGMENTS.indexOf(segment) * 250,
    sharePct: 100 / AGE_SEGMENTS.length,
    conversions: 0,
    cpa: null as number | null,
    color: AGE_SEGMENT_COLORS[segment] ?? "#94a3b8",
    placeholder: true as const
  }));

  const displayChartRows = hasData ? chartRows : placeholderRows;

  return (
    <section
      className={
        embedded
          ? "h-full min-h-0 w-full"
          : "campaign-creator-card campaign-creator-card--compact flex h-full min-h-0 flex-col"
      }
      aria-labelledby="age-breakdown-title"
    >
      <div className="mb-2 shrink-0">
        <h3
          id="age-breakdown-title"
          className="campaign-creator-orion-section-label"
        >
          {t("ageBreakdownTitle")}
        </h3>
        <p className="mt-0.5 text-[10px]" style={{ color: "var(--text-dimmer)" }}>
          {t("ageBreakdownSubtitle")}
        </p>
      </div>

      {isLoading ? (
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
                  width={44}
                  tick={{ ...premiumAxisTick(), fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                {hasData ? (
                  <Tooltip
                    cursor={{ fill: "rgba(124,58,237,0.06)" }}
                    content={<AgeTooltip locale={locale} />}
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
                <tr className="text-[var(--text-dimmer)]">
                  <th className="pb-1.5 pr-2 font-semibold uppercase tracking-wide">{t("ageBreakdownColSegment")}</th>
                  <th className="pb-1.5 pr-2 text-right font-semibold uppercase tracking-wide">{t("ageBreakdownColSpend")}</th>
                  <th className="pb-1.5 pr-2 text-right font-semibold uppercase tracking-wide">{t("ageBreakdownColShare")}</th>
                  <th className="pb-1.5 pr-2 text-right font-semibold uppercase tracking-wide">{t("ageBreakdownColConversions")}</th>
                  <th className="pb-1.5 text-right font-semibold uppercase tracking-wide">{t("ageBreakdownColCpa")}</th>
                </tr>
              </thead>
              <tbody>
                {(hasData ? rows.filter((r) => r.spend > 0 || r.conversions > 0) : rows).map((row) => (
                  <tr
                    key={row.segment}
                    className="border-t border-[var(--creator-card-border,var(--border-color))]"
                    style={{ color: "var(--text-main)" }}
                  >
                    <td className="py-1.5 pr-2 font-medium">{row.segment}</td>
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
                      {row.cpa != null && row.conversions > 0
                        ? formatBRL(row.cpa, locale)
                        : "—"}
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
