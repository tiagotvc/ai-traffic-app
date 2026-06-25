"use client";

import { useTranslations } from "next-intl";
import { BarChart3, ChevronDown, ChevronUp, LineChart, TrendingUp } from "lucide-react";

import { ChartVisualPanel } from "@/components/dashboard/canvas/panels/ChartVisualPanel";
import { PeriodPresetGrid } from "@/components/dashboard/canvas/panels/PeriodPresetGrid";
import { TableColumnsPanel } from "@/components/dashboard/canvas/panels/TableColumnsPanel";
import { TableStylePanel } from "@/components/dashboard/canvas/panels/TableStylePanel";
import type { PropertyPanelTab } from "@/components/dashboard/canvas/panels/PropertyPanelTabs";
import {
  BuilderChartStyleGrid,
  BuilderField,
  BuilderMetricPicker,
  BuilderSelect
} from "@/components/dashboard/canvas/WidgetBuilderUi";
import { cn } from "@/lib/cn";
import type { TableBlockConfig, TableEntity, KpiCardStyle } from "@/lib/dashboard/app-block-config";
import type { ExtendedPeriodPreset } from "@/lib/dashboard/extended-period";
import type { ExtendedChartStyle } from "@/lib/dashboard/slot-visual-config";
import { parseSlotVisualConfig } from "@/lib/dashboard/slot-visual-config";
import { METRIC_CATALOG, type MetricKey } from "@/lib/dashboard-metrics";

export function TablePropertyPanel({
  config,
  onPatch,
  tab = "content",
  featuredStyle = false
}: {
  config: TableBlockConfig;
  onPatch: (patch: Partial<TableBlockConfig>) => void;
  tab?: PropertyPanelTab;
  featuredStyle?: boolean;
}) {
  const t = useTranslations("dashboardWidgets");
  const tMetrics = useTranslations("metrics");

  if (tab === "style") {
    return <TableStylePanel config={config} onPatch={onPatch} featured={featuredStyle} />;
  }

  return (
    <div className="space-y-5">
      <section>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
          {t("wizardStep_tableEntity")}
        </p>
        <div className="grid gap-1.5">
          {(["clients", "campaigns"] as TableEntity[]).map((entity) => (
            <button
              key={entity}
              type="button"
              disabled={entity !== "clients"}
              onClick={() => onPatch({ entity })}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-xs font-medium",
                config.entity === entity
                  ? "border-[rgba(14,165,233,0.45)] bg-[rgba(14,165,233,0.08)]"
                  : "border-[var(--border-color)] text-[var(--text-dim)]",
                entity !== "clients" && "opacity-50"
              )}
            >
              {t(`tableEntity_${entity}`)}
            </button>
          ))}
        </div>
      </section>

      <TableColumnsPanel config={config} onPatch={onPatch} />

      <section>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
          {t("wizardStep_period")}
        </p>
        <PeriodPresetGrid
          value={config.periodPreset}
          onChange={(periodPreset) => onPatch({ periodPreset })}
        />
      </section>
    </div>
  );
}

export function AnalyzePropertyPanel({
  config,
  onPatch,
  tab = "content",
  advancedStylingUnlocked = true
}: {
  config: Record<string, unknown>;
  onPatch: (patch: Record<string, unknown>) => void;
  tab?: PropertyPanelTab;
  advancedStylingUnlocked?: boolean;
}) {
  const t = useTranslations("dashboardWidgets");
  const tMetrics = useTranslations("metrics");
  const metricKeys = (config.metricKeys as MetricKey[]) ?? ["spend"];
  const displayMode = (config.displayMode as string) ?? "both";

  if (tab === "style") {
    return (
      <div className="space-y-5">
        <section>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
            {t("panelKpiStyle")}
          </p>
          <div className="grid gap-2">
            {(["default", "compact", "elevated"] as KpiCardStyle[]).map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => onPatch({ kpiStyle: style })}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-xs font-medium",
                  (config.kpiStyle ?? "default") === style
                    ? "border-[rgba(124,58,237,0.45)] bg-[rgba(124,58,237,0.08)] text-[#a78bfa]"
                    : "border-[var(--border-color)] text-[var(--text-dim)]"
                )}
              >
                {t(`kpiStyle_${style}`)}
              </button>
            ))}
          </div>
        </section>
        {(displayMode === "chart" || displayMode === "both") && (
          <>
            <section>
              <BuilderChartStyleGrid
                value={(config.chartStyle as ExtendedChartStyle) ?? "area"}
                onChange={(chartStyle) => onPatch({ chartStyle })}
                t={(key) => t(key)}
                advancedUnlocked={advancedStylingUnlocked}
              />
            </section>
            <section>
              <ChartVisualPanel
                visual={parseSlotVisualConfig(config)}
                metricKeys={(config.chartMetrics as MetricKey[]) ?? metricKeys}
                onChange={(patch) => onPatch(patch)}
              />
            </section>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section>
        <BuilderField label={t("wizardMetricsLabel")}>
          <BuilderMetricPicker
            activeKeys={metricKeys}
            tMetrics={(key) => tMetrics(key)}
            onToggle={(key) => {
              const has = metricKeys.includes(key);
              const next = has ? metricKeys.filter((k) => k !== key) : [...metricKeys, key];
              onPatch({ metricKeys: next.length ? next : [key], chartMetrics: next });
            }}
          />
        </BuilderField>
      </section>
      <section>
        <PeriodPresetGrid
          value={(config.periodPreset as ExtendedPeriodPreset) ?? "last7"}
          onChange={(periodPreset) => onPatch({ periodPreset })}
        />
      </section>
      <section>
        <BuilderField label={t("wizardCompareLabel")}>
          <div className="flex gap-2">
            {[true, false].map((val) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => onPatch({ comparePreviousPeriod: val })}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium",
                  config.comparePreviousPeriod === val
                    ? "border-[rgba(124,58,237,0.45)] bg-[rgba(124,58,237,0.1)] text-[#a78bfa]"
                    : "border-[var(--border-color)] text-[var(--text-dim)]"
                )}
              >
                {val ? t("wizardCompareYes") : t("wizardCompareNo")}
              </button>
            ))}
          </div>
        </BuilderField>
      </section>
      <section>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
          {t("wizardStep_display")}
        </p>
        <div className="grid gap-2">
          {(["values", "chart", "both"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onPatch({ displayMode: mode })}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium",
                displayMode === mode
                  ? "border-[rgba(124,58,237,0.45)] bg-[rgba(124,58,237,0.08)]"
                  : "border-[var(--border-color)] text-[var(--text-dim)]"
              )}
            >
              {mode === "values" ? (
                <TrendingUp size={14} />
              ) : mode === "chart" ? (
                <LineChart size={14} />
              ) : (
                <BarChart3 size={14} />
              )}
              {t(`display_${mode}`)}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export function GoalPropertyPanel({
  config,
  onPatch
}: {
  config: Record<string, unknown>;
  onPatch: (patch: Record<string, unknown>) => void;
}) {
  const t = useTranslations("dashboardWidgets");
  const tMetrics = useTranslations("metrics");

  return (
    <div className="space-y-5">
      <BuilderField label={t("wizardGoalMetric")}>
        <BuilderSelect
          value={(config.metricKey as string) ?? "spend"}
          onChange={(v) => onPatch({ metricKey: v })}
          options={METRIC_CATALOG.map((m) => ({ value: m.key, label: tMetrics(m.label) }))}
        />
      </BuilderField>
      <BuilderField label={t("wizardGoalRule")}>
        <BuilderSelect
          value={(config.operator as string) ?? "lte"}
          onChange={(v) => onPatch({ operator: v })}
          options={[
            { value: "lte", label: t("wizardGoalMax") },
            { value: "gte", label: t("wizardGoalMin") }
          ]}
        />
      </BuilderField>
      <BuilderField label={t("wizardGoalValue")}>
        <input
          type="number"
          min={0}
          step="any"
          value={Number(config.targetValue) || 0}
          onChange={(e) => onPatch({ targetValue: Number(e.target.value) || 0 })}
          className="ui-input w-full"
        />
      </BuilderField>
      <PeriodPresetGrid
        value={(config.periodPreset as ExtendedPeriodPreset) ?? "last7"}
        onChange={(periodPreset) => onPatch({ periodPreset })}
      />
      <BuilderField label={t("wizardGoalAlertAt")}>
        <input
          type="number"
          min={50}
          max={99}
          value={Number(config.alertAtPercent) || 80}
          onChange={(e) => onPatch({ alertAtPercent: Number(e.target.value) || 80 })}
          className="ui-input w-full"
        />
      </BuilderField>
      <label className="flex items-center gap-2 text-xs text-[var(--text-main)]">
        <input
          type="checkbox"
          checked={config.pulseAtLimit !== false}
          onChange={(e) => onPatch({ pulseAtLimit: e.target.checked })}
        />
        {t("wizardGoalPulse")}
      </label>
    </div>
  );
}
