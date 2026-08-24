"use client";

import { LineChart as LineChartIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";
import { DsSegmentedControl, type DsSegmentedOption } from "@/design-system/components/DsSegmentedControl";
import { METRIC_BY_KEY, type MetricKey } from "@/lib/dashboard-metrics";
import type { ReportChartStyle } from "@/components/reports/ReportPreview";
import type { SeriesStyle } from "@/lib/dashboard/slot-visual-config";

type Props = {
  open: boolean;
  chartStyle: ReportChartStyle;
  chartSeriesStyles: Partial<Record<MetricKey, SeriesStyle>>;
  /** As métricas que hoje entram no gráfico de performance (até 3, mesma regra do ReportPreview). */
  chartMetrics: MetricKey[];
  onClose: () => void;
  onApply: (style: ReportChartStyle, seriesStyles: Partial<Record<MetricKey, SeriesStyle>>) => void;
};

const SERIES_STYLE_OPTIONS: SeriesStyle[] = ["line", "bar", "area"];

export function ReportChartTypeModal({
  open,
  chartStyle,
  chartSeriesStyles,
  chartMetrics,
  onClose,
  onApply
}: Props) {
  const t = useTranslations("reports");
  const tMetrics = useTranslations("metrics");
  const [draftStyle, setDraftStyle] = useState<ReportChartStyle>(chartStyle);
  const [draftSeriesStyles, setDraftSeriesStyles] =
    useState<Partial<Record<MetricKey, SeriesStyle>>>(chartSeriesStyles);

  useEffect(() => {
    if (open) {
      setDraftStyle(chartStyle);
      setDraftSeriesStyles(chartSeriesStyles);
    }
  }, [open, chartStyle, chartSeriesStyles]);

  const styleOptions: DsSegmentedOption<ReportChartStyle>[] = [
    { value: "line", label: t("chartStyleLine") },
    { value: "area", label: t("chartStyleArea") },
    { value: "bar", label: t("chartStyleBar") },
    { value: "composed", label: t("chartStyleComposed") }
  ];

  const seriesStyleOptions: DsSegmentedOption<SeriesStyle>[] = SERIES_STYLE_OPTIONS.map((s) => ({
    value: s,
    label: t(`chartStyle${s === "line" ? "Line" : s === "bar" ? "Bar" : "Area"}`)
  }));

  function handleApply() {
    onApply(draftStyle, draftSeriesStyles);
    onClose();
  }

  return (
    <CreatorModalShell
      open={open}
      onClose={onClose}
      title={t("chartTypeModalTitle")}
      subtitle={t("chartTypeModalHint")}
      titleIcon={<LineChartIcon size={16} />}
      width="md"
      onCancel={onClose}
      onPrimary={handleApply}
      primaryLabel={t("chartTypeApply")}
    >
      <DsSegmentedControl
        value={draftStyle}
        onChange={setDraftStyle}
        options={styleOptions}
        ariaLabel={t("chartTypeModalTitle")}
        className="w-full"
      />

      {draftStyle === "composed" && chartMetrics.length > 1 ? (
        <div className="mt-4 space-y-3 border-t border-[var(--border-color)] pt-4">
          <p className="text-xs text-[var(--text-dim)]">{t("chartStyleComposedHint")}</p>
          {chartMetrics.map((key) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-[var(--text-main)]">
                {t("chartSeriesStyleLabel", { metric: tMetrics(METRIC_BY_KEY[key].label) })}
              </span>
              <DsSegmentedControl
                value={draftSeriesStyles[key] ?? "line"}
                onChange={(v) => setDraftSeriesStyles((cur) => ({ ...cur, [key]: v }))}
                options={seriesStyleOptions}
                ariaLabel={tMetrics(METRIC_BY_KEY[key].label)}
              />
            </div>
          ))}
        </div>
      ) : null}
    </CreatorModalShell>
  );
}
