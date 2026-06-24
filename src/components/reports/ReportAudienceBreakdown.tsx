"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from "recharts";

import { ChartContainer } from "@/components/ui/ChartContainer";
import { formatMetricValue } from "@/lib/dashboard-metrics";
import { formatBRL, formatPercent } from "@/lib/format";
import type { ReportBreakdownSection } from "@/lib/report-breakdown-data";

const BAR_COLORS = ["#f5a623", "#7c3aed", "#10b981", "#6366f1", "#ec4899", "#0ea5e9", "#94a3b8"];

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

function BreakdownCard({
  section,
  locale,
  isPrint
}: {
  section: ReportBreakdownSection;
  locale: string;
  isPrint: boolean;
}) {
  const t = useTranslations("reports");

  const titleKey =
    section.type === "gender"
      ? "breakdownGenderTitle"
      : section.type === "age"
        ? "breakdownAgeTitle"
        : "breakdownDeviceTitle";

  const chartData = useMemo(
    () =>
      section.rows.map((row) => ({
        name: row.label,
        spend: row.spend,
        share: row.sharePct
      })),
    [section.rows]
  );

  return (
    <div className="ui-card overflow-hidden p-4">
      <div className="text-sm font-semibold text-[var(--text-main)]">{t(titleKey)}</div>
      <p className="mt-1 text-xs text-[var(--text-dim)]">{t("breakdownSpendShareHint")}</p>

      <div className="mt-3 h-44">
        <ChartContainer height={176}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 8, left: 4, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
            <XAxis type="number" tick={TICK} {...AXIS} tickFormatter={(v) => formatBRL(Number(v), locale)} />
            <YAxis
              type="category"
              dataKey="name"
              tick={TICK}
              {...AXIS}
              width={isPrint ? 72 : 84}
            />
            <Tooltip
              formatter={(value, _name, item) => {
                const share = (item?.payload as { share?: number } | undefined)?.share;
                const shareLabel = share != null ? ` (${formatPercent(share, 1, locale)})` : "";
                return [`${formatBRL(Number(value ?? 0), locale)}${shareLabel}`, t("spend")];
              }}
              contentStyle={TOOLTIP_STYLE}
            />
            <Bar dataKey="spend" radius={[0, 4, 4, 0]} maxBarSize={18}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>

      <div
        className={`mt-3 rounded-xl border border-[var(--border-color)] ${
          isPrint ? "report-print-table-wrap" : "overflow-x-auto"
        }`}
      >
        <table className={`w-full text-left text-xs ${isPrint ? "report-print-table" : ""}`}>
          <thead>
            <tr className="border-b border-[var(--border-color)] bg-[var(--surface-bg)]">
              <th className="px-3 py-2 font-semibold text-[var(--text-dim)]">{t("breakdownColSegment")}</th>
              <th className="px-3 py-2 text-right font-semibold text-[var(--text-dim)]">{t("spend")}</th>
              <th className="px-3 py-2 text-right font-semibold text-[var(--text-dim)]">{t("colShare")}</th>
              <th className="px-3 py-2 text-right font-semibold text-[var(--text-dim)]">
                {t("breakdownColConversions")}
              </th>
              <th className="px-3 py-2 text-right font-semibold text-[var(--text-dim)]">CPA</th>
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row) => (
              <tr key={row.value} className="border-b border-[var(--border-color)] last:border-b-0">
                <td className="px-3 py-2 font-medium text-[var(--text-main)]">{row.label}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-[var(--text-main)]">
                  {formatBRL(row.spend, locale)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-[var(--text-dim)]">
                  {formatPercent(row.sharePct, 1, locale)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-[var(--text-dim)]">
                  {formatMetricValue("conversions", row.conversions, locale)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-[var(--text-dim)]">
                  {row.cpa != null ? formatBRL(row.cpa, locale) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ReportAudienceBreakdown({
  sections,
  locale,
  isPrint = false
}: {
  sections: ReportBreakdownSection[];
  locale: string;
  isPrint?: boolean;
}) {
  const t = useTranslations("reports");

  if (!sections.length) return null;

  return (
    <section className={`report-pdf-section ${isPrint ? "report-print-section" : ""} report-print-avoid-break`}>
      <div className="mb-3">
        <div className="text-sm font-semibold text-[var(--text-main)]">{t("breakdownSectionTitle")}</div>
        <p className="mt-1 text-xs text-[var(--text-dim)]">{t("breakdownSectionSubtitle")}</p>
      </div>
      <div className="report-pdf-grid-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
        {sections.map((section) => (
          <BreakdownCard key={section.type} section={section} locale={locale} isPrint={isPrint} />
        ))}
      </div>
    </section>
  );
}
