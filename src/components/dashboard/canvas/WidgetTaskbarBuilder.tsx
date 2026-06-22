"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, Bell, LayoutGrid, Plus } from "lucide-react";

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
import { TaskbarTemplatePicker } from "@/components/dashboard/canvas/TaskbarTemplatePicker";
import { WidgetLivePreview } from "@/components/dashboard/canvas/WidgetLivePreview";
import {
  TaskbarWidget,
  updateTaskbarSlotChartMetrics,
  updateTaskbarSlotMetric
} from "@/components/dashboard/canvas/widgets/TaskbarWidget";
import {
  METRIC_BY_KEY,
  type MetricKey
} from "@/lib/dashboard-metrics";
import {
  normalizeChartMetrics,
  toggleChartMetricSelection
} from "@/lib/dashboard/chart-metrics";
import {
  mergeSlotVisual,
  parseExtendedChartStyle,
  parseSlotVisualConfig,
  type SlotFontFamily,
  type SlotFontSize,
  type StrokeWeight
} from "@/lib/dashboard/slot-visual-config";
import {
  appendCompositeSlot,
  COMPOSITE_SLOT_KINDS,
  getSlotWeight,
  MAX_SLOT_WEIGHT,
  normalizeTaskbarSlots,
  remapSlotsForOrientation,
  setSlotWeight,
  slotKindFromWidgetType,
  updateSlotConfig,
  updateSlotKind,
  type CompositeSlotKind,
  type TaskbarOrientation
} from "@/lib/dashboard/taskbar-config";
import type { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";
import { buildTaskbarConfigFromTemplate } from "@/lib/dashboard/taskbar-templates";

type DashboardData = ReturnType<typeof useDashboardData>;
type EditorTab = "content" | "visual" | "advanced";

const ADD_ICONS: Record<CompositeSlotKind, typeof LayoutGrid> = {
  metric: LayoutGrid,
  chart: BarChart3,
  alerts: Bell
};

export function usesTaskbarBuilder(type: string): boolean {
  return type === "layout.taskbar" || type === "premium.metricMatrix";
}

export function WidgetTaskbarBuilder({
  config,
  onChange,
  dashboardData,
  advancedStylingUnlocked = false
}: {
  titleKey: string;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  dashboardData?: DashboardData;
  advancedStylingUnlocked?: boolean;
}) {
  const t = useTranslations("dashboardWidgets");
  const tMetrics = useTranslations("metrics");
  const tPeriod = useTranslations("period");
  const orientation = (config.orientation as TaskbarOrientation | undefined) ?? "horizontal";
  const slots = normalizeTaskbarSlots(config.slots);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(slots[0]?.id ?? null);
  const [editorTab, setEditorTab] = useState<EditorTab>("content");
  const compact = orientation === "horizontal";
  const selectedSlot = slots.find((s) => s.id === selectedSlotId);
  const selectedKind = selectedSlot ? slotKindFromWidgetType(selectedSlot.widgetType) : null;
  const chartMetrics = selectedSlot
    ? normalizeChartMetrics(selectedSlot.config.chartMetrics, ["spend", "roas"])
    : [];
  const visual = selectedSlot ? parseSlotVisualConfig(selectedSlot.config) : {};
  const chartStyle = selectedSlot
    ? parseExtendedChartStyle(selectedSlot.config.chartStyle)
    : "area";

  const patch = (patchConfig: Record<string, unknown>) =>
    onChange({ ...config, ...patchConfig, templateId: undefined });

  const setSlots = (next: typeof slots) => {
    patch({ slots: next });
    if (next.length && !next.find((s) => s.id === selectedSlotId)) {
      setSelectedSlotId(next[0]?.id ?? null);
    }
  };

  const patchSlot = (slotId: string, slotPatch: Record<string, unknown>) => {
    setSlots(updateSlotConfig(slots, slotId, slotPatch));
  };

  const patchVisual = (slotId: string, visualPatch: Parameters<typeof mergeSlotVisual>[1]) => {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return;
    setSlots(
      updateSlotConfig(slots, slotId, mergeSlotVisual(slot.config, visualPatch))
    );
  };

  const addBlock = (kind: CompositeSlotKind) => {
    const next = appendCompositeSlot(slots, kind, orientation);
    if (next.length > slots.length) {
      setSlots(next);
      setSelectedSlotId(next[next.length - 1]?.id ?? null);
      setEditorTab("content");
    }
  };

  const editorTabs = [
    { id: "content" as const, label: t("slotTabContent") },
    { id: "visual" as const, label: t("slotTabVisual"), premium: !advancedStylingUnlocked },
    { id: "advanced" as const, label: t("slotTabAdvanced"), premium: !advancedStylingUnlocked }
  ];

  return (
    <div className="space-y-4">
      <TaskbarTemplatePicker
        activeTemplateId={(config.templateId as string | undefined) ?? null}
        advancedUnlocked={advancedStylingUnlocked}
        dashboardData={dashboardData}
        onApply={(templateId) => {
          const next = buildTaskbarConfigFromTemplate(templateId);
          if (!next) return;
          onChange({ ...config, ...next, templateId });
          const first = normalizeTaskbarSlots(next.slots)[0];
          setSelectedSlotId(first?.id ?? null);
          setEditorTab("content");
        }}
      />

      <div className="flex flex-wrap items-end gap-3">
        <BuilderField label={t("taskbarOrientation")} className="min-w-[160px] flex-1 sm:flex-none sm:max-w-[200px]">
          <BuilderSelect
            value={orientation}
            onChange={(v) => {
              const next = v as TaskbarOrientation;
              patch({ orientation: next, slots: remapSlotsForOrientation(slots, next) });
            }}
            options={[
              { value: "horizontal", label: t("taskbarOrientationHorizontal") },
              { value: "vertical", label: t("taskbarOrientationVertical") }
            ]}
          />
        </BuilderField>
        <p className="pb-2 text-xs text-[var(--text-dim)]">
          {t("taskbarSlotsCount", { count: slots.length, max: 6 })}
        </p>
      </div>

      {slots.length < 6 ? (
        <div
          className="flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5"
          style={{ borderColor: "var(--border-color)", background: "var(--surface-bg)" }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
            {t("taskbarAddBlock")}
          </span>
          {COMPOSITE_SLOT_KINDS.map((kind) => {
            const Icon = ADD_ICONS[kind];
            return (
              <button
                key={kind}
                type="button"
                onClick={() => addBlock(kind)}
                className="ui-btn-secondary !px-2.5 !py-1.5 text-[11px]"
              >
                <Plus size={12} />
                <Icon size={12} />
                {t(`compositeSlot_${kind}`)}
              </button>
            );
          })}
        </div>
      ) : null}

      <BuilderPreviewFrame
        title={t("configPreview")}
        hint={t("taskbarPreviewHint")}
        minHeight={orientation === "vertical" ? 320 : 280}
      >
        {dashboardData ? (
          <TaskbarWidget
            data={dashboardData}
            orientation={orientation}
            slots={slots}
            preview
            selectedSlotId={selectedSlotId}
            onSelectSlot={(id) => {
              setSelectedSlotId(id);
              if (id) setEditorTab("content");
            }}
            onSlotsChange={setSlots}
          />
        ) : (
          <WidgetLivePreview widgetType="layout.taskbar" config={config} />
        )}
      </BuilderPreviewFrame>

      {selectedSlot ? (
        <BuilderSlotContext
          title={t("compositeSlotEditing", { type: t(`compositeSlot_${selectedKind}`) })}
          tabs={editorTabs}
          activeTab={editorTab}
          onTabChange={(id) => setEditorTab(id as EditorTab)}
        >
          {editorTab === "content" ? (
            <div className="space-y-3">
              <BuilderField label={t("compositeSlotType")}>
                <BuilderSegment
                  value={selectedKind ?? "metric"}
                  onChange={(v) =>
                    setSlots(updateSlotKind(slots, selectedSlot.id, v as CompositeSlotKind, orientation))
                  }
                  options={COMPOSITE_SLOT_KINDS.map((kind) => ({
                    value: kind,
                    label: t(`compositeSlot_${kind}`)
                  }))}
                />
              </BuilderField>

              {selectedKind === "metric" ? (
                <BuilderField label={t("taskbarPickMetric")}>
                  <BuilderMetricPicker
                    activeKeys={[
                      (selectedSlot.config.metricKey as MetricKey | undefined) ??
                        (selectedSlot.widgetType.startsWith("metric.single.")
                          ? (selectedSlot.widgetType.replace("metric.single.", "") as MetricKey)
                          : "spend")
                    ]}
                    max={1}
                    tMetrics={tMetrics}
                    onToggle={(key) =>
                      setSlots(updateTaskbarSlotMetric(slots, selectedSlot.id, key, compact))
                    }
                  />
                </BuilderField>
              ) : null}

              {selectedKind === "chart" ? (
                <>
                  <BuilderField label={t("configChartStyle")}>
                    <BuilderChartStyleGrid
                      value={chartStyle}
                      t={t}
                      advancedUnlocked={advancedStylingUnlocked}
                      onChange={(v) => patchSlot(selectedSlot.id, { chartStyle: v })}
                    />
                  </BuilderField>
                  <BuilderField label={t("configChartMetrics")}>
                    <BuilderMetricPicker
                      activeKeys={chartMetrics}
                      max={3}
                      tMetrics={tMetrics}
                      onToggle={(key) =>
                        setSlots(
                          updateTaskbarSlotChartMetrics(
                            slots,
                            selectedSlot.id,
                            toggleChartMetricSelection(chartMetrics, key, 3)
                          )
                        )
                      }
                    />
                  </BuilderField>
                </>
              ) : null}

              <BuilderField label={t("configWidgetPeriod")}>
              <BuilderSelect
                value={(selectedSlot.config.periodPreset as string | undefined) ?? "global"}
                onChange={(v) => patchSlot(selectedSlot.id, { periodPreset: v })}
                options={[
                  { value: "global", label: t("configWidgetPeriodGlobal") },
                  ...WIDGET_PERIOD_PRESETS.map((p) => ({
                    value: p,
                    label: tPeriod(p)
                  }))
                ]}
              />
            </BuilderField>

            <BuilderField label={t("taskbarSlotSize")}>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={1}
                    max={MAX_SLOT_WEIGHT}
                    value={getSlotWeight(selectedSlot)}
                    onChange={(e) =>
                      setSlots(setSlotWeight(slots, selectedSlot.id, Number(e.target.value)))
                    }
                    className="h-1.5 flex-1 cursor-pointer accent-indigo-500"
                  />
                  <span className="w-8 text-right text-xs font-medium text-[var(--text-dim)]">
                    {getSlotWeight(selectedSlot)}/{MAX_SLOT_WEIGHT}
                  </span>
                </div>
              </BuilderField>
            </div>
          ) : null}

          {editorTab === "visual" ? (
            <BuilderPremiumLock locked={!advancedStylingUnlocked} message={t("slotStylePremiumLock")}>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <BuilderColorInput
                    label={t("slotTextColor")}
                    value={visual.textColor ?? "#94a3b8"}
                    onChange={(v) => patchVisual(selectedSlot.id, { textColor: v })}
                    disabled={!advancedStylingUnlocked}
                  />
                  {selectedKind === "metric" ? (
                    <BuilderColorInput
                      label={t("slotAccentColor")}
                      value={visual.accentColor ?? "#6366f1"}
                      onChange={(v) => patchVisual(selectedSlot.id, { accentColor: v })}
                      disabled={!advancedStylingUnlocked}
                    />
                  ) : null}
                </div>

                <BuilderField label={t("slotFontFamily")}>
                  <BuilderSelect
                    value={visual.fontFamily ?? "system"}
                    onChange={(v) => patchVisual(selectedSlot.id, { fontFamily: v as SlotFontFamily })}
                    options={[
                      { value: "system", label: t("slotFontSystem") },
                      { value: "heading", label: t("slotFontHeading") },
                      { value: "mono", label: t("slotFontMono") }
                    ]}
                  />
                </BuilderField>

                <BuilderField label={t("slotFontSize")}>
                  <BuilderSegment
                    value={visual.fontSize ?? "md"}
                    onChange={(v) => patchVisual(selectedSlot.id, { fontSize: v as SlotFontSize })}
                    options={[
                      { value: "sm", label: t("slotFontSizeSm") },
                      { value: "md", label: t("slotFontSizeMd") },
                      { value: "lg", label: t("slotFontSizeLg") }
                    ]}
                  />
                </BuilderField>

                {selectedKind === "chart" && chartMetrics.length ? (
                  <BuilderField label={t("slotMetricColors")}>
                    <div className="flex flex-wrap gap-3">
                      {chartMetrics.map((key) => (
                        <BuilderColorInput
                          key={key}
                          label={tMetrics(METRIC_BY_KEY[key]?.label ?? key)}
                          value={visual.customColors?.[key] ?? METRIC_BY_KEY[key]?.color ?? "#6366f1"}
                          onChange={(v) =>
                            patchVisual(selectedSlot.id, {
                              customColors: { ...visual.customColors, [key]: v }
                            })
                          }
                          disabled={!advancedStylingUnlocked}
                        />
                      ))}
                    </div>
                  </BuilderField>
                ) : null}
              </div>
            </BuilderPremiumLock>
          ) : null}

          {editorTab === "advanced" ? (
            <BuilderPremiumLock locked={!advancedStylingUnlocked} message={t("slotStylePremiumLock")}>
              <div className="space-y-3">
                {selectedKind === "chart" ? (
                  <>
                    <BuilderField label={t("slotLineThickness")}>
                      <BuilderSegment
                        value={String(visual.lineStrokeWidth ?? 2)}
                        onChange={(v) =>
                          patchVisual(selectedSlot.id, { lineStrokeWidth: Number(v) as StrokeWeight })
                        }
                        options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: String(n) }))}
                      />
                    </BuilderField>
                    <BuilderField label={t("slotBarThickness")}>
                      <BuilderSegment
                        value={String(visual.barThickness ?? 2)}
                        onChange={(v) =>
                          patchVisual(selectedSlot.id, { barThickness: Number(v) as StrokeWeight })
                        }
                        options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: String(n) }))}
                      />
                    </BuilderField>
                  </>
                ) : (
                  <p className="text-xs text-[var(--text-dim)]">{t("slotAdvancedChartOnly")}</p>
                )}
              </div>
            </BuilderPremiumLock>
          ) : null}
        </BuilderSlotContext>
      ) : (
        <p className="rounded-xl border border-dashed px-4 py-6 text-center text-xs text-[var(--text-dimmer)]">
          {t("taskbarSelectSlotHint")}
        </p>
      )}
    </div>
  );
}
