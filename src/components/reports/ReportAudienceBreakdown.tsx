"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from "recharts";
import { Maximize2, Settings2 } from "lucide-react";

import { ReportBreakdownGrid } from "@/components/reports/ReportBreakdownGrid";
import { ChartContainer } from "@/components/ui/ChartContainer";
import { formatMetricValue } from "@/lib/dashboard-metrics";
import { formatBRL, formatPercent } from "@/lib/format";
import type { ReportBreakdownSection, ReportBreakdownType } from "@/lib/report-breakdown-data";
import {
  fitBreakdownLayoutToContent,
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

  const yAxisWidth = useMemo(() => {
    const longest = section.rows.reduce((max, row) => Math.max(max, row.label.length), 0);
    return Math.min(96, Math.max(48, longest * 5.5));
  }, [section.rows]);

  const chartHeight = Math.max(72, section.rows.length * 28 + 16);
  const maxBarSize = Math.max(10, Math.min(20, Math.floor(chartHeight / Math.max(section.rows.length, 1)) - 4));
  const isFullWidth = section.type === "age";

  return (
    <div
      className={`report-breakdown-card ui-card overflow-visible p-3 ${
        isFullWidth ? "report-breakdown-card--full" : ""
      }`}
    >
      <div>
        <div className="text-sm font-semibold text-[var(--text-main)]">{t(titleKey)}</div>
        <p className="mt-0.5 text-[10px] text-[var(--text-dim)]">{t("breakdownSpendShareHint")}</p>
      </div>

      <div className="mt-2" style={{ height: chartHeight }}>
        <ChartContainer height={chartHeight}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 2, right: 6, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
            <XAxis
              type="number"
              tick={TICK}
              {...AXIS}
              tickFormatter={(v) => formatBRL(Number(v), locale)}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={TICK}
              {...AXIS}
              width={yAxisWidth}
              tickFormatter={(v) => (String(v).length > 14 ? `${String(v).slice(0, 13)}…` : String(v))}
            />
            <Tooltip
              formatter={(value, _name, item) => {
                const share = (item?.payload as { share?: number } | undefined)?.share;
                const shareLabel = share != null ? ` (${formatPercent(share, 1, locale)})` : "";
                return [`${formatBRL(Number(value ?? 0), locale)}${shareLabel}`, t("spend")];
              }}
              contentStyle={TOOLTIP_STYLE}
            />
            <Bar dataKey="spend" radius={[0, 4, 4, 0]} maxBarSize={maxBarSize}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>

      <div className="report-breakdown-table-wrap mt-2 overflow-visible rounded-xl border border-[var(--border-color)]">
        <table
          className={`report-breakdown-table w-full text-left text-[10px] ${
            isPrint ? "report-print-table" : ""
          }`}
        >
          <thead>
            <tr className="border-b border-[var(--border-color)] bg-[var(--surface-bg)]">
              <th className="px-2 py-1 font-semibold text-[var(--text-dim)]">{t("breakdownColSegment")}</th>
              <th className="px-2 py-1 text-right font-semibold text-[var(--text-dim)]">{t("spend")}</th>
              <th className="px-2 py-1 text-right font-semibold text-[var(--text-dim)]">{t("colShare")}</th>
              <th className="px-2 py-1 text-right font-semibold text-[var(--text-dim)]">
                {t("breakdownColConversions")}
              </th>
              <th className="px-2 py-1 text-right font-semibold text-[var(--text-dim)]">CPA</th>
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row) => (
              <tr key={row.value} className="border-b border-[var(--border-color)] last:border-b-0">
                <td className="break-words px-2 py-1 font-medium text-[var(--text-main)]">{row.label}</td>
                <td className="whitespace-nowrap px-2 py-1 text-right text-[var(--text-main)]">
                  {formatBRL(row.spend, locale)}
                </td>
                <td className="whitespace-nowrap px-2 py-1 text-right text-[var(--text-dim)]">
                  {formatPercent(row.sharePct, 1, locale)}
                </td>
                <td className="whitespace-nowrap px-2 py-1 text-right text-[var(--text-dim)]">
                  {formatMetricValue("conversions", row.conversions, locale)}
                </td>
                <td className="whitespace-nowrap px-2 py-1 text-right text-[var(--text-dim)]">
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

function applyFittedLayout(
  sections: ReportBreakdownSection[],
  layout: ReportBreakdownLayoutItem[]
): ReportBreakdownLayoutItem[] {
  return fitBreakdownLayoutToContent(
    sections.map((s) => ({ type: s.type, rows: s.rows })),
    layout
  );
}

export function ReportAudienceBreakdown({
  sections,
  locale,
  isPrint = false,
  initialLayout
}: {
  sections: ReportBreakdownSection[];
  locale: string;
  isPrint?: boolean;
  initialLayout?: ReportBreakdownLayoutItem[];
}) {
  const t = useTranslations("reports");
  const sectionTypes = useMemo(() => sections.map((s) => s.type), [sections]);
  const sectionByType = useMemo(
    () => new Map(sections.map((section) => [section.type, section])),
    [sections]
  );

  const [layoutEditMode, setLayoutEditMode] = useState(false);
  const [gridLayout, setGridLayout] = useState<ReportBreakdownLayoutItem[]>(() => {
    const base = mergeBreakdownLayout(
      sectionTypes,
      initialLayout?.length ? initialLayout : loadReportBreakdownLayout()
    );
    return applyFittedLayout(sections, base);
  });

  const sectionTypesKey = sectionTypes.join(",");
  const rowCountsKey = useMemo(
    () => sections.map((s) => `${s.type}:${s.rows.length}`).join("|"),
    [sections]
  );

  const persistLayout = useCallback(
    (next: ReportBreakdownLayoutItem[], fitHeights: boolean) => {
      const resolved = fitHeights ? applyFittedLayout(sections, next) : next;
      setGridLayout(resolved);
      if (!isPrint) saveReportBreakdownLayout(resolved);
    },
    [sections, isPrint]
  );

  useEffect(() => {
    if (layoutEditMode || isPrint) return;
    setGridLayout((prev) => {
      const base = mergeBreakdownLayout(sectionTypes, prev.length ? prev : loadReportBreakdownLayout());
      const fitted = applyFittedLayout(sections, base);
      saveReportBreakdownLayout(fitted);
      return fitted;
    });
  }, [rowCountsKey, sectionTypesKey, layoutEditMode, isPrint, sections, sectionTypes]);

  function handleFitToContent() {
    persistLayout(gridLayout, true);
  }

  function handleLayoutChange(next: ReportBreakdownLayoutItem[]) {
    persistLayout(next, false);
  }

  function toggleEditMode() {
    setLayoutEditMode((prev) => {
      const next = !prev;
      if (prev) persistLayout(gridLayout, true);
      return next;
    });
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
          <div className="no-print flex flex-wrap items-center justify-end gap-2">
            {layoutEditMode ? (
              <p className="w-full text-right text-[10px] text-[var(--text-dim)] sm:w-auto">
                {t("breakdownLayoutCustomizeHint")}
              </p>
            ) : null}
            <button
              type="button"
              onClick={handleFitToContent}
              className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-[var(--surface-bg)]"
              style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
            >
              <Maximize2 size={14} />
              {t("breakdownFitToContent")}
            </button>
            <button
              type="button"
              onClick={toggleEditMode}
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
        sections={sections}
        editMode={layoutEditMode}
        isPrint={isPrint}
        onLayoutChange={handleLayoutChange}
        renderCard={(type: ReportBreakdownType) => {
          const section = sectionByType.get(type);
          if (!section) return null;
          return <BreakdownCard section={section} locale={locale} isPrint={isPrint} />;
        }}
      />
    </section>
  );
}
