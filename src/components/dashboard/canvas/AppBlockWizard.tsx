"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, LineChart, Table2, Target, TrendingUp } from "lucide-react";

import { WidgetBuilderPreviewPanel } from "@/components/dashboard/canvas/WidgetBuilderPreviewPanel";
import { WidgetLivePreview } from "@/components/dashboard/canvas/WidgetLivePreview";
import { ChartVisualPanel } from "@/components/dashboard/canvas/panels/ChartVisualPanel";
import { PeriodPresetGrid } from "@/components/dashboard/canvas/panels/PeriodPresetGrid";
import {
  BuilderChartStyleGrid,
  BuilderField,
  BuilderMetricPicker,
  BuilderSelect
} from "@/components/dashboard/canvas/WidgetBuilderUi";
import { cn } from "@/lib/cn";
import {
  appBlockConfigToWidget,
  defaultAnalyzeConfig,
  defaultGoalConfig,
  defaultTableConfig,
  type AnalyzeBlockConfig,
  type AppBlockConfig,
  type AppBlockIntent,
  type GoalBlockConfig,
  type TableBlockConfig,
  type TableEntity,
  widgetConfigToAppBlock
} from "@/lib/dashboard/app-block-config";
import {
  filteredSteps,
  validateStep,
  type WizardStepId
} from "@/lib/dashboard/app-block-flow";
import type { ExtendedChartStyle } from "@/lib/dashboard/slot-visual-config";
import { METRIC_CATALOG, type MetricKey } from "@/lib/dashboard-metrics";
import type { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";

type DashboardData = ReturnType<typeof useDashboardData>;

const INTENTS: Array<{ id: AppBlockIntent; icon: typeof TrendingUp; color: string }> = [
  { id: "analyze", icon: TrendingUp, color: "#7c3aed" },
  { id: "goal", icon: Target, color: "#f59e0b" },
  { id: "table", icon: Table2, color: "#0ea5e9" }
];

/** @deprecated Use WidgetPalette + WidgetPropertyPanel instead. */
export function AppBlockWizard({
  open,
  dashboardData,
  advancedStylingUnlocked = true,
  editWidgetType,
  editConfig,
  onClose,
  onConfirm
}: {
  open: boolean;
  dashboardData?: DashboardData;
  advancedStylingUnlocked?: boolean;
  editWidgetType?: string;
  editConfig?: Record<string, unknown>;
  onClose: () => void;
  onConfirm: (widgetType: string, config: Record<string, unknown>) => void;
}) {
  const t = useTranslations("dashboardWidgets");
  const tMetrics = useTranslations("metrics");

  const initialConfig = useMemo((): AppBlockConfig | null => {
    if (editWidgetType && editConfig) {
      return widgetConfigToAppBlock(editWidgetType, editConfig);
    }
    return null;
  }, [editWidgetType, editConfig]);

  const [config, setConfig] = useState<AppBlockConfig | null>(initialConfig);
  const [stepIndex, setStepIndex] = useState(initialConfig ? 1 : 0);

  const steps = useMemo(() => filteredSteps(config), [config]);
  const currentStep = steps[stepIndex] ?? "intent";

  const previewPayload = useMemo(() => {
    if (!config) return null;
    const { widgetType, config: raw } = appBlockConfigToWidget(config);
    return { widgetType, config: raw };
  }, [config]);

  const patchAnalyze = useCallback((patch: Partial<AnalyzeBlockConfig>) => {
    setConfig((cur) => {
      const base = cur?.intent === "analyze" ? cur : defaultAnalyzeConfig();
      return { ...base, ...patch, intent: "analyze" };
    });
  }, []);

  const patchGoal = useCallback((patch: Partial<GoalBlockConfig>) => {
    setConfig((cur) => {
      const base = cur?.intent === "goal" ? cur : defaultGoalConfig();
      return { ...base, ...patch, intent: "goal" };
    });
  }, []);

  const patchTable = useCallback((patch: Partial<TableBlockConfig>) => {
    setConfig((cur) => {
      const base = cur?.intent === "table" ? cur : defaultTableConfig();
      return { ...base, ...patch, intent: "table" };
    });
  }, []);

  const selectIntent = (intent: AppBlockIntent) => {
    if (intent === "analyze") setConfig(defaultAnalyzeConfig());
    else if (intent === "goal") setConfig(defaultGoalConfig());
    else if (intent === "table") setConfig(defaultTableConfig());
    setStepIndex(1);
  };

  const goNext = () => {
    if (!validateStep(currentStep, config)) return;
    if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1);
    else if (config) {
      const { widgetType, config: raw } = appBlockConfigToWidget(config);
      onConfirm(widgetType, raw);
      onClose();
    }
  };

  const goBack = () => {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
    else onClose();
  };

  if (!open) return null;

  const stepContent = renderStep({
    step: currentStep,
    config,
    t,
    tMetrics,
    selectIntent,
    patchAnalyze,
    patchGoal,
    patchTable,
    advancedStylingUnlocked
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border shadow-xl"
        style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
      >
        <div className="ui-panel-header shrink-0 px-5 py-3.5">
          <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">
            {editWidgetType ? t("wizardEditBlock") : t("wizardAddBlock")}
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-dim)]">
            {t(`wizardStep_${currentStep}`)} · {stepIndex + 1}/{steps.length}
          </p>
        </div>

        {previewPayload && dashboardData ? (
          <div className="shrink-0 border-b px-5 py-3" style={{ borderColor: "var(--border-color)" }}>
            <WidgetBuilderPreviewPanel>
              <WidgetLivePreview
                widgetType={previewPayload.widgetType}
                config={previewPayload.config}
                dashboardData={dashboardData}
              />
            </WidgetBuilderPreviewPanel>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{stepContent}</div>

        <div
          className="flex shrink-0 items-center justify-between gap-2 border-t px-5 py-3"
          style={{ borderColor: "var(--border-color)" }}
        >
          <button type="button" onClick={goBack} className="ui-btn ui-btn-ghost text-sm">
            {stepIndex === 0 ? t("close") : t("configCancel")}
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!validateStep(currentStep, config)}
            className="ui-btn ui-btn-primary text-sm disabled:opacity-50"
          >
            {stepIndex >= steps.length - 1 ? t("wizardConfirmAdd") : t("wizardNext")}
          </button>
        </div>
      </div>
    </div>
  );
}

function renderStep(args: {
  step: WizardStepId;
  config: AppBlockConfig | null;
  t: ReturnType<typeof useTranslations>;
  tMetrics: ReturnType<typeof useTranslations>;
  selectIntent: (intent: AppBlockIntent) => void;
  patchAnalyze: (p: Partial<AnalyzeBlockConfig>) => void;
  patchGoal: (p: Partial<GoalBlockConfig>) => void;
  patchTable: (p: Partial<TableBlockConfig>) => void;
  advancedStylingUnlocked: boolean;
}) {
  const { step, config, t, tMetrics, selectIntent, patchAnalyze, patchGoal, patchTable } = args;

  if (step === "intent") {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {INTENTS.map(({ id, icon: Icon, color }) => (
          <button
            key={id}
            type="button"
            onClick={() => selectIntent(id)}
            className={cn(
              "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors hover:border-[rgba(124,58,237,0.35)]",
              config?.intent === id && "border-[rgba(124,58,237,0.45)] bg-[rgba(124,58,237,0.06)]"
            )}
            style={{ borderColor: "var(--border-color)" }}
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ background: `${color}18`, color }}
            >
              <Icon size={20} />
            </span>
            <span className="text-sm font-semibold text-[var(--text-main)]">{t(`intent_${id}`)}</span>
            <span className="text-xs leading-relaxed text-[var(--text-dim)]">{t(`intent_${id}Hint`)}</span>
          </button>
        ))}
      </div>
    );
  }

  if (step === "metrics" && config?.intent === "analyze") {
    return (
      <BuilderField label={t("wizardMetricsLabel")}>
        <BuilderMetricPicker
          activeKeys={config.metricKeys}
          tMetrics={(key) => tMetrics(key)}
          onToggle={(key) => {
            const has = config.metricKeys.includes(key);
            const next = has
              ? config.metricKeys.filter((k) => k !== key)
              : [...config.metricKeys, key].slice(0, 4);
            patchAnalyze({
              metricKeys: next.length ? next : [key],
              chartMetrics: next.length ? next : [key]
            });
          }}
        />
      </BuilderField>
    );
  }

  if (step === "period" && config) {
    return (
      <PeriodPresetGrid
        value={config.periodPreset ?? "last7"}
        onChange={(periodPreset) => {
          if (config.intent === "analyze") patchAnalyze({ periodPreset });
          else if (config.intent === "goal") patchGoal({ periodPreset });
          else patchTable({ periodPreset });
        }}
      />
    );
  }

  if (step === "compare" && config?.intent === "analyze") {
    return (
      <BuilderField label={t("wizardCompareLabel")}>
        <div className="flex gap-2">
          {[true, false].map((val) => (
            <button
              key={String(val)}
              type="button"
              onClick={() => patchAnalyze({ comparePreviousPeriod: val })}
              className={cn(
                "rounded-lg border px-4 py-2 text-sm font-medium",
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
    );
  }

  if (step === "display" && config?.intent === "analyze") {
    const modes = ["values", "chart", "both"] as const;
    return (
      <div className="grid gap-2 sm:grid-cols-3">
        {modes.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => patchAnalyze({ displayMode: mode })}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border p-4",
              config.displayMode === mode
                ? "border-[rgba(124,58,237,0.45)] bg-[rgba(124,58,237,0.08)]"
                : "border-[var(--border-color)]"
            )}
          >
            {mode === "values" ? <TrendingUp size={20} /> : mode === "chart" ? <LineChart size={20} /> : <BarChart3 size={20} />}
            <span className="text-xs font-semibold text-[var(--text-main)]">{t(`display_${mode}`)}</span>
          </button>
        ))}
      </div>
    );
  }

  if (step === "chartType" && config?.intent === "analyze") {
    return (
      <BuilderChartStyleGrid
        value={config.chartStyle ?? "area"}
        onChange={(chartStyle) => patchAnalyze({ chartStyle: chartStyle as ExtendedChartStyle })}
        t={(key) => t(key)}
        advancedUnlocked={args.advancedStylingUnlocked}
      />
    );
  }

  if (step === "visual" && config?.intent === "analyze") {
    return (
      <ChartVisualPanel
        visual={config.visual ?? {}}
        metricKeys={config.chartMetrics ?? config.metricKeys}
        onChange={(patch) => patchAnalyze({ visual: { ...config.visual, ...patch } })}
      />
    );
  }

  if (step === "goalMetric" && config?.intent === "goal") {
    return (
      <BuilderField label={t("wizardGoalMetric")}>
        <BuilderSelect
          value={config.metricKey}
          onChange={(v) => patchGoal({ metricKey: v as MetricKey })}
          options={METRIC_CATALOG.map((m) => ({ value: m.key, label: tMetrics(m.label) }))}
        />
      </BuilderField>
    );
  }

  if (step === "goalRule" && config?.intent === "goal") {
    return (
      <BuilderField label={t("wizardGoalRule")}>
        <BuilderSelect
          value={config.operator}
          onChange={(v) => patchGoal({ operator: v as "lte" | "gte" })}
          options={[
            { value: "lte", label: t("wizardGoalMax") },
            { value: "gte", label: t("wizardGoalMin") }
          ]}
        />
      </BuilderField>
    );
  }

  if (step === "goalValue" && config?.intent === "goal") {
    return (
      <BuilderField label={t("wizardGoalValue")}>
        <input
          type="number"
          min={0}
          step="any"
          value={config.targetValue}
          onChange={(e) => patchGoal({ targetValue: Number(e.target.value) || 0 })}
          className="ui-input w-full"
        />
      </BuilderField>
    );
  }

  if (step === "goalAlert" && config?.intent === "goal") {
    return (
      <div className="space-y-4">
        <BuilderField label={t("wizardGoalAlertAt")}>
          <input
            type="number"
            min={50}
            max={99}
            value={config.alertAtPercent ?? 80}
            onChange={(e) => patchGoal({ alertAtPercent: Number(e.target.value) || 80 })}
            className="ui-input w-full"
          />
        </BuilderField>
        <label className="flex items-center gap-2 text-sm text-[var(--text-main)]">
          <input
            type="checkbox"
            checked={config.pulseAtLimit !== false}
            onChange={(e) => patchGoal({ pulseAtLimit: e.target.checked })}
          />
          {t("wizardGoalPulse")}
        </label>
      </div>
    );
  }

  if (step === "tableEntity" && config?.intent === "table") {
    const entities: TableEntity[] = ["clients", "campaigns", "creatives", "accounts"];
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {entities.map((entity) => (
          <button
            key={entity}
            type="button"
            disabled={entity !== "clients"}
            onClick={() => patchTable({ entity })}
            className={cn(
              "rounded-xl border p-3 text-left text-sm font-medium",
              config.entity === entity
                ? "border-[rgba(14,165,233,0.45)] bg-[rgba(14,165,233,0.08)]"
                : "border-[var(--border-color)] text-[var(--text-dim)]",
              entity !== "clients" && "opacity-50"
            )}
          >
            {t(`tableEntity_${entity}`)}
            {entity !== "clients" ? (
              <span className="mt-1 block text-[10px] font-normal text-[var(--text-dimmer)]">
                {t("comingSoon")}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    );
  }

  if (step === "tableColumns" && config?.intent === "table") {
    return (
      <BuilderField label={t("wizardTableColumns")}>
        <BuilderMetricPicker
          activeKeys={config.columns}
          tMetrics={(key) => tMetrics(key)}
          onToggle={(key) => {
            const has = config.columns.includes(key);
            const next = has ? config.columns.filter((k) => k !== key) : [...config.columns, key];
            patchTable({ columns: next.length ? next : [key] });
          }}
        />
      </BuilderField>
    );
  }

  if (step === "tableFilters" && config?.intent === "table") {
    return <p className="text-sm text-[var(--text-dim)]">{t("wizardTableFiltersHint")}</p>;
  }

  if (step === "tableSort" && config?.intent === "table") {
    return (
      <div className="space-y-4">
        <BuilderField label={t("wizardTableSort")}>
          <BuilderSelect
            value={String(config.sortColumn ?? "roas")}
            onChange={(v) => patchTable({ sortColumn: v === "name" ? "name" : (v as MetricKey) })}
            options={[
              { value: "name", label: t("wizardTableColName") },
              ...config.columns.map((c) => ({ value: c, label: tMetrics(c) }))
            ]}
          />
        </BuilderField>
        <BuilderField label={t("wizardTableTopN")}>
          <BuilderSelect
            value={String(config.topN ?? 25)}
            onChange={(v) => patchTable({ topN: Number(v) })}
            options={[
              { value: "10", label: "10" },
              { value: "25", label: "25" },
              { value: "50", label: "50" }
            ]}
          />
        </BuilderField>
      </div>
    );
  }

  if (step === "confirm" && config) {
    return (
      <div className="rounded-xl border p-4 text-sm text-[var(--text-dim)]" style={{ borderColor: "var(--border-color)" }}>
        <p>{t("wizardConfirmHint")}</p>
        <p className="mt-2 font-medium text-[var(--text-main)]">{t(`intent_${config.intent}`)}</p>
      </div>
    );
  }

  return null;
}
