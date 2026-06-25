"use client";

import { useLocale, useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from "recharts";

import { PremiumChartFrame } from "@/components/charts/PremiumChartFrame";
import { ChartContainer } from "@/components/ui/ChartContainer";
import { premiumAxisTick, premiumGridProps } from "@/lib/dashboard/premium-chart-theme";
import { formatBRL, formatNumber, formatPercent } from "@/lib/format";
import type { AgeBreakdownRow } from "@/lib/dashboard-age-breakdown";

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

  return (
    <section
      className={embedded ? "h-full min-h-0 w-full" : "dashboard-panel rounded-2xl p-4 sm:p-5"}
      aria-labelledby="age-breakdown-title"
    >
      <div className="mb-3">
        <h3
          id="age-breakdown-title"
          className="font-heading text-sm font-semibold"
          style={{ color: "var(--text-main)" }}
        >
          {t("ageBreakdownTitle")}
        </h3>
        <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-dimmer)" }}>
          {t("ageBreakdownSubtitle")}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <div className="skeleton-shimmer h-[200px] rounded-xl" />
          <div className="skeleton-shimmer h-24 rounded-xl" />
        </div>
      ) : !hasData ? (
        <div
          className="rounded-xl border px-4 py-8 text-center text-sm"
          style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
        >
          {t("ageBreakdownEmpty")}
        </div>
      ) : (
        <>
          <ChartContainer height={Math.max(180, chartRows.length * 36 + 24)} className="mb-4 w-full">
            <PremiumChartFrame compact>
              <BarChart
                data={chartRows}
                layout="vertical"
                margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
              >
                <CartesianGrid {...premiumGridProps()} horizontal={false} />
                <XAxis
                  type="number"
                  tick={premiumAxisTick()}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatBRL(Number(v), locale)}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={48}
                  tick={{ ...premiumAxisTick(), fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(124,58,237,0.06)" }}
                  content={<AgeTooltip locale={locale} />}
                />
                <Bar dataKey="spend" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {chartRows.map((row) => (
                    <Cell key={row.segment} fill={row.color} />
                  ))}
                </Bar>
              </BarChart>
            </PremiumChartFrame>
          </ChartContainer>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-[11px]">
              <thead>
                <tr style={{ color: "var(--text-dimmer)" }}>
                  <th className="pb-2 pr-3 font-medium">{t("ageBreakdownColSegment")}</th>
                  <th className="pb-2 pr-3 text-right font-medium">{t("ageBreakdownColSpend")}</th>
                  <th className="pb-2 pr-3 text-right font-medium">{t("ageBreakdownColShare")}</th>
                  <th className="pb-2 pr-3 text-right font-medium">{t("ageBreakdownColConversions")}</th>
                  <th className="pb-2 text-right font-medium">{t("ageBreakdownColCpa")}</th>
                </tr>
              </thead>
              <tbody>
                {rows
                  .filter((r) => r.spend > 0 || r.conversions > 0)
                  .map((row) => (
                    <tr
                      key={row.segment}
                      className="border-t"
                      style={{ borderColor: "var(--border-color)", color: "var(--text-main)" }}
                    >
                      <td className="py-2 pr-3 font-medium">{row.segment}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {formatBRL(row.spend, locale)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {formatPercent(row.sharePct, 1, locale)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {formatNumber(row.conversions, locale)}
                      </td>
                      <td className="py-2 text-right tabular-nums">
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
