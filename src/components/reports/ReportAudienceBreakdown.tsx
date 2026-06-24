"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from "recharts";
import { Settings2 } from "lucide-react";

import { ReportBreakdownGrid } from "@/components/reports/ReportBreakdownGrid";
import { ChartContainer } from "@/components/ui/ChartContainer";
import { formatMetricValue } from "@/lib/dashboard-metrics";
import { formatBRL, formatPercent } from "@/lib/format";
import type { ReportBreakdownSection, ReportBreakdownType } from "@/lib/report-breakdown-data";
import {
  loadReportBreakdownLayout,
  mergeBreakdownLayout,
  saveReportBreakdownLayout,
  type ReportBreakdownLayoutItem
} from "@/lib/report-breakdown-layout";

const BAR_COLORS = ["#f5a623", "#7c3aed", "#10b981", "#6366f1", "#ec4899", "#0ea5e9", "#94a3b8"];

const GRID_STROKE = "var(--border-color)";
const TICK = { fill: "var(--text-dimmer)", fontSize: 9 };
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
  isPrint,
  fill
}: {
  section: ReportBreakdownSection;
  locale: string;
  isPrint: boolean;
  fill?: boolean;
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

  const yAxisWidth = useMemo(() => {
    const longest = section.rows.reduce((max, row) => Math.max(max, row.label.length), 0);
    return Math.min(110, Math.max(56, longest * 6));
  }, [section.rows]);

  const rootClass = fill
    ? "report-breakdown-card ui-card flex h-full min-h-0 flex-col overflow-hidden p-3"
    : "report-breakdown-card ui-card overflow-visible p-4";

  return (
    <div className={rootClass}>
      <div className="shrink-0">
        <div className="text-sm font-semibold text-[var(--text-main)]">{t(titleKey)}</div>
        <p className="mt-0.5 text-[10px] text-[var(--text-dim)]">{t("breakdownSpendShareHint")}</p>
      </div>

      <div className={fill ? "mt-2 min-h-0 flex-1" : "mt-3 h-36"}>
        <ChartContainer height={fill ? "100%" : 144} className={fill ? "h-full" : undefined}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 2, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
            <XAxis
              type="number"
              tick={TICK}
              {...AXIS}
              tickFormatter={(v) => formatBRL(Number(v), locale)}
            />
            <YAxis type="category" dataKey="name" tick={TICK} {...AXIS} width={yAxisWidth} />
            <Tooltip
              formatter={(value, _name, item) => {
                const share = (item?.payload as { share?: number } | undefined)?.share;
                const shareLabel = share != null ? ` (${formatPercent(share, 1, locale)})` : "";
                return [`${formatBRL(Number(value ?? 0), locale)}${shareLabel}`, t("spend")];
              }}
              contentStyle={TOOLTIP_STYLE}
            />
            <Bar dataKey="spend" radius={[0, 4, 4, 0]} maxBarSize={16}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>

      <div
        className={`report-breakdown-table-wrap mt-2 shrink-0 rounded-xl border border-[var(--border-color)] ${
          fill && !isPrint ? "max-h-[42%] overflow-auto" : ""
        }`}
      >
        <table
          className={`report-breakdown-table w-full text-left text-[10px] sm:text-xs ${
            isPrint ? "report-print-table" : ""
          }`}
        >
          <thead>
            <tr className="border-b border-[var(--border-color)] bg-[var(--surface-bg)]">
              <th className="px-2 py-1.5 font-semibold text-[var(--text-dim)]">{t("breakdownColSegment")}</th>
              <th className="px-2 py-1.5 text-right font-semibold text-[var(--text-dim)]">{t("spend")}</th>
              <th className="px-2 py-1.5 text-right font-semibold text-[var(--text-dim)]">{t("colShare")}</th>
              <th className="px-2 py-1.5 text-right font-semibold text-[var(--text-dim)]">
                {t("breakdownColConversions")}
              </th>
              <th className="px-2 py-1.5 text-right font-semibold text-[var(--text-dim)]">CPA</th>
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row) => (
              <tr key={row.value} className="border-b border-[var(--border-color)] last:border-b-0">
                <td className="px-2 py-1.5 font-medium text-[var(--text-main)]">{row.label}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-right text-[var(--text-main)]">
                  {formatBRL(row.spend, locale)}
                </td>
                <td className="whitespace-nowrap px-2 py-1.5 text-right text-[var(--text-dim)]">
                  {formatPercent(row.sharePct, 1, locale)}
                </td>
                <td className="whitespace-nowrap px-2 py-1.5 text-right text-[var(--text-dim)]">
                  {formatMetricValue("conversions", row.conversions, locale)}
                </td>
                <td className="whitespace-nowrap px-2 py-1.5 text-right text-[var(--text-dim)]">
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
  const sectionTypes = useMemo(() => sections.map((s) => s.type), [sections]);
  const sectionByType = useMemo(
    () => new Map(sections.map((section) => [section.type, section])),
    [sections]
  );

  const [layoutEditMode, setLayoutEditMode] = useState(false);
  const [gridLayout, setGridLayout] = useState<ReportBreakdownLayoutItem[]>(() =>
    mergeBreakdownLayout(sectionTypes, loadReportBreakdownLayout())
  );

  useEffect(() => {
    setGridLayout(mergeBreakdownLayout(sectionTypes, loadReportBreakdownLayout()));
  }, [sectionTypes]);

  function handleLayoutChange(next: ReportBreakdownLayoutItem[]) {
    setGridLayout(next);
    saveReportBreakdownLayout(next);
  }

  if (!sections.length) return null;

  return (
    <section
      className={`report-breakdown-section report-pdf-section ${isPrint ? "report-print-section" : ""}`}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-[var(--text-main)]">{t("breakdownSectionTitle")}</div>
          <p className="mt-1 text-xs text-[var(--text-dim)]">{t("breakdownSectionSubtitle")}</p>
        </div>
        {!isPrint ? (
          <div className="no-print flex flex-col items-end gap-1">
            {layoutEditMode ? (
              <p className="text-[10px] text-[var(--text-dim)]">{t("breakdownLayoutCustomizeHint")}</p>
            ) : null}
            <button
              type="button"
              onClick={() => setLayoutEditMode((v) => !v)}
              className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-[var(--surface-bg)]"
              style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
            >
              <Settings2 size={14} />
              {layoutEditMode ? t("breakdownLayoutCustomizeDone") : t("breakdownLayoutCustomize")}
            </button>
          </div>
        ) : null}
      </div>

      <ReportBreakdownGrid
        layout={gridLayout}
        editMode={layoutEditMode}
        isPrint={isPrint}
        onLayoutChange={handleLayoutChange}
        renderCard={(type: ReportBreakdownType) => {
          const section = sectionByType.get(type);
          if (!section) return null;
          return <BreakdownCard section={section} locale={locale} isPrint={isPrint} fill />;
        }}
      />
    </section>
  );
}
