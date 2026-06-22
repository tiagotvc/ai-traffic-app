"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { DashboardPerformanceChart } from "@/components/dashboard/DashboardPerformanceChart";
import {
  BuilderChartStyleGrid,
  BuilderColorInput,
  BuilderField,
  BuilderMetricPicker,
  BuilderPremiumLock,
  BuilderPreviewFrame,
  BuilderSegment,
  BuilderSelect,
  BuilderSlotContext
} from "@/components/dashboard/canvas/WidgetBuilderUi";
import { WIDGET_PERIOD_PRESETS } from "@/lib/dashboard/widget-period";
import {
  MAX_CANVAS_CHART_METRICS,
  METRIC_BY_KEY,
  METRIC_CATALOG,
  type MetricKey
} from "@/lib/dashboard-metrics";
import {
  normalizeChartMetrics,
  toggleChartMetricSelection,
  type ChartBarLayout
} from "@/lib/dashboard/chart-metrics";
import {
  mergeSlotVisual,
  parseExtendedChartStyle,
  parseSlotVisualConfig,
  type StrokeWeight
} from "@/lib/dashboard/slot-visual-config";
import { toChartData } from "@/uxpilot-ui/adapters/dashboard-mappers";
import { useWidgetScopedDashboardData } from "@/uxpilot-ui/adapters/useWidgetScopedDashboardData";
import { parseWidgetPeriod } from "@/lib/dashboard/widget-period";
import type { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";

type DashboardData = ReturnType<typeof useDashboardData>;
type EditorTab = "data" | "visual" | "advanced";

export function usesChartBuilder(type: string): boolean {
  return type === "chart.performance" || type === "chart.compare" || type === "premium.multiChart";
}

export function WidgetChartBuilder({
  widgetType,
  titleKey,
  config,
  onChange,
  dashboardData,
  hideHeader = false,
  advancedStylingUnlocked = false
}: {
  widgetType: string;
  titleKey: string;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  dashboardData?: DashboardData;
  hideHeader?: boolean;
  advancedStylingUnlocked?: boolean;
}) {
  const t = useTranslations("dashboardWidgets");
  const tMetrics = useTranslations("metrics");
  const tPeriod = useTranslations("period");
  const [editorTab, setEditorTab] = useState<EditorTab>("data");

  const chartStyle = parseExtendedChartStyle(config.chartStyle);
  const barLayout = (config.barLayout as ChartBarLayout | undefined) ?? "vertical";
  const chartMetrics = normalizeChartMetrics(config.chartMetrics);
  const visual = parseSlotVisualConfig(config);
  const isCompare = widgetType === "chart.compare";
  const metricA = (config.metricA as MetricKey | undefined) ?? "spend";
  const metricB = (config.metricB as MetricKey | undefined) ?? "roas";
  const previewMetrics = isCompare ? [metricA, metricB] : chartMetrics;

  const periodPreset = parseWidgetPeriod(config);
  const previewData = useWidgetScopedDashboardData(dashboardData ?? ({} as DashboardData), periodPreset);

  const patchVisual = (patch: Parameters<typeof mergeSlotVisual>[1]) => {
    onChange(mergeSlotVisual(config, patch));
  };

  const toggleMetric = (key: MetricKey) => {
    if (isCompare) return;
    onChange({
      ...config,
      chartMetrics: toggleChartMetricSelection(chartMetrics, key, MAX_CANVAS_CHART_METRICS)
    });
  };

  const editorTabs = [
    { id: "data" as const, label: t("slotTabContent") },
    { id: "visual" as const, label: t("slotTabVisual"), premium: !advancedStylingUnlocked },
    { id: "advanced" as const, label: t("slotTabAdvanced"), premium: !advancedStylingUnlocked }
  ];

  const previewSeries = dashboardData ? previewData.series : [];

  return (
    <div className="space-y-4">
      {!hideHeader ? (
        <div>
          <p className="text-sm font-semibold text-[var(--text-main)]">
            {t("builderTitle", { widget: t(titleKey) })}
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-dim)]">{t("builderHint")}</p>
        </div>
      ) : null}

      <BuilderPreviewFrame title={t("configPreview")} minHeight={240}>
        {dashboardData ? (
          <div className="h-[220px]">
            <DashboardPerformanceChart
              data={toChartData(previewSeries, previewData.locale)}
              activeMetrics={previewMetrics}
              formatValue={previewData.formatMetricValue}
              metricLabels={previewData.chartMetricLabels}
              isLoading={previewData.loading}
              variant="embedded"
              chartStyle={chartStyle}
              barLayout={barLayout}
              disableToggle
              visual={visual}
            />
          </div>
        ) : (
          <div className="skeleton-shimmer h-[200px] rounded-lg" />
        )}
      </BuilderPreviewFrame>

      <BuilderSlotContext
        title={t("chartBuilderSettings")}
        tabs={editorTabs}
        activeTab={editorTab}
        onTabChange={(id) => setEditorTab(id as EditorTab)}
      >
        {editorTab === "data" ? (
          <div className="space-y-3">
            <BuilderField label={t("configChartStyle")}>
              <BuilderChartStyleGrid
                value={chartStyle}
                t={t}
                advancedUnlocked={advancedStylingUnlocked}
                onChange={(v) => onChange({ ...config, chartStyle: v })}
              />
            </BuilderField>

            <div className="grid grid-cols-2 gap-3">
              {chartStyle === "bar" ? (
                <BuilderField label={t("configBarLayout")}>
                  <BuilderSelect
                    value={barLayout}
                    onChange={(v) => onChange({ ...config, barLayout: v })}
                    options={[
                      { value: "vertical", label: t("configBarLayoutVertical") },
                      { value: "horizontal", label: t("configBarLayoutHorizontal") }
                    ]}
                  />
                </BuilderField>
              ) : null}

              {!isCompare ? (
                <BuilderField label={t("configWidgetPeriod")} className={chartStyle === "bar" ? "" : "col-span-2"}>
                  <BuilderSelect
                    value={(config.periodPreset as string | undefined) ?? "global"}
                    onChange={(v) => onChange({ ...config, periodPreset: v })}
                    options={[
                      { value: "global", label: t("configWidgetPeriodGlobal") },
                      ...WIDGET_PERIOD_PRESETS.map((p) => ({ value: p, label: tPeriod(p) }))
                    ]}
                  />
                </BuilderField>
              ) : null}
            </div>

            {isCompare ? (
              <div className="grid grid-cols-2 gap-3">
                <MetricSelect
                  label={t("configMetricA")}
                  value={metricA}
                  onChange={(v) => onChange({ ...config, metricA: v })}
                  tMetrics={tMetrics}
                />
                <MetricSelect
                  label={t("configMetricB")}
                  value={metricB}
                  onChange={(v) => onChange({ ...config, metricB: v })}
                  tMetrics={tMetrics}
                />
              </div>
            ) : (
              <BuilderField label={t("configChartMetrics")}>
                <div className="mb-1.5 flex justify-end">
                  <span className="text-[10px] text-[var(--text-dimmer)]">
                    {t("configChartMetricsCount", {
                      count: chartMetrics.length,
                      max: MAX_CANVAS_CHART_METRICS
                    })}
                  </span>
                </div>
                <BuilderMetricPicker
                  activeKeys={chartMetrics}
                  max={MAX_CANVAS_CHART_METRICS}
                  tMetrics={tMetrics}
                  onToggle={toggleMetric}
                />
              </BuilderField>
            )}
          </div>
        ) : null}

        {editorTab === "visual" ? (
          <BuilderPremiumLock locked={!advancedStylingUnlocked} message={t("slotStylePremiumLock")}>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                {previewMetrics.map((key) => (
                  <BuilderColorInput
                    key={key}
                    label={tMetrics(METRIC_BY_KEY[key]?.label ?? key)}
                    value={visual.customColors?.[key] ?? METRIC_BY_KEY[key]?.color ?? "#6366f1"}
                    onChange={(v) =>
                      patchVisual({ customColors: { ...visual.customColors, [key]: v } })
                    }
                    disabled={!advancedStylingUnlocked}
                  />
                ))}
              </div>
              <BuilderField label={t("slotTextColor")}>
                <BuilderColorInput
                  label={t("configChartAxisColor")}
                  value={visual.textColor ?? "#94a3b8"}
                  onChange={(v) => patchVisual({ textColor: v })}
                  disabled={!advancedStylingUnlocked}
                />
              </BuilderField>
            </div>
          </BuilderPremiumLock>
        ) : null}

        {editorTab === "advanced" ? (
          <BuilderPremiumLock locked={!advancedStylingUnlocked} message={t("slotStylePremiumLock")}>
            <div className="space-y-3">
              {(chartStyle === "line" || chartStyle === "area" || chartStyle === "radar") && (
                <BuilderField label={t("slotLineThickness")}>
                  <BuilderSegment
                    value={String(visual.lineStrokeWidth ?? 2)}
                    onChange={(v) =>
                      patchVisual({ lineStrokeWidth: Number(v) as StrokeWeight })
                    }
                    options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: String(n) }))}
                  />
                </BuilderField>
              )}
              {chartStyle === "bar" && (
                <BuilderField label={t("slotBarThickness")}>
                  <BuilderSegment
                    value={String(visual.barThickness ?? 2)}
                    onChange={(v) => patchVisual({ barThickness: Number(v) as StrokeWeight })}
                    options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: String(n) }))}
                  />
                </BuilderField>
              )}
              {chartStyle === "pie" || chartStyle === "donut" ? (
                <p className="text-xs text-[var(--text-dim)]">{t("chartPieHint")}</p>
              ) : null}
            </div>
          </BuilderPremiumLock>
        ) : null}
      </BuilderSlotContext>
    </div>
  );
}

function MetricSelect({
  label,
  value,
  onChange,
  tMetrics
}: {
  label: string;
  value: MetricKey;
  onChange: (v: MetricKey) => void;
  tMetrics: (key: MetricKey) => string;
}) {
  return (
    <BuilderField label={label}>
      <BuilderSelect
        value={value}
        onChange={(v) => onChange(v as MetricKey)}
        options={METRIC_CATALOG.map((m) => ({
          value: m.key,
          label: tMetrics(m.label)
        }))}
      />
    </BuilderField>
  );
}
