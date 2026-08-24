"use client";

import { LineChart as LineChartIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ReportChartTypeModal } from "@/components/reports/ReportChartTypeModal";
import type { ReportChartStyle } from "@/components/reports/ReportPreview";
import { cn } from "@/lib/cn";
import type { MetricKey } from "@/lib/dashboard-metrics";
import type { SeriesStyle } from "@/lib/dashboard/slot-visual-config";

export function ReportChartTypePicker({
  chartStyle,
  chartSeriesStyles,
  chartMetrics,
  onChange,
  className
}: {
  chartStyle: ReportChartStyle;
  chartSeriesStyles: Partial<Record<MetricKey, SeriesStyle>>;
  chartMetrics: MetricKey[];
  onChange: (style: ReportChartStyle, seriesStyles: Partial<Record<MetricKey, SeriesStyle>>) => void;
  className?: string;
}) {
  const t = useTranslations("reports");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "ui-btn-secondary inline-flex items-center gap-1.5 self-end text-xs",
          className
        )}
      >
        <LineChartIcon size={14} aria-hidden />
        {t("selectChartType")}
        <span className="text-[10px] font-semibold text-[var(--text-dim)]">
          · {t(`chartStyle${chartStyle === "line" ? "Line" : chartStyle === "area" ? "Area" : chartStyle === "bar" ? "Bar" : "Composed"}`)}
        </span>
      </button>

      <ReportChartTypeModal
        open={open}
        chartStyle={chartStyle}
        chartSeriesStyles={chartSeriesStyles}
        chartMetrics={chartMetrics}
        onClose={() => setOpen(false)}
        onApply={onChange}
      />
    </>
  );
}
