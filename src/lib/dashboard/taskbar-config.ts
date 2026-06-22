import type { CSSProperties } from "react";
import type { MetricKey } from "@/lib/dashboard-metrics";

export type TaskbarOrientation = "horizontal" | "vertical";

export type CompositeSlotKind = "metric" | "chart" | "alerts";

export type TaskbarSlot = {
  id: string;
  widgetType: string;
  config: Record<string, unknown>;
};

export const MIN_SLOT_WEIGHT = 1;
export const MAX_SLOT_WEIGHT = 5;

export function defaultSlotWeight(kind: CompositeSlotKind): number {
  switch (kind) {
    case "chart":
      return 3;
    case "alerts":
      return 2;
    default:
      return 1;
  }
}

export function getSlotWeight(slot: TaskbarSlot): number {
  const raw = slot.config.slotWeight;
  if (typeof raw === "number" && raw >= MIN_SLOT_WEIGHT && raw <= MAX_SLOT_WEIGHT) {
    return raw;
  }
  return defaultSlotWeight(slotKindFromWidgetType(slot.widgetType));
}

export function setSlotWeight(slots: TaskbarSlot[], slotId: string, weight: number): TaskbarSlot[] {
  const next = Math.max(MIN_SLOT_WEIGHT, Math.min(MAX_SLOT_WEIGHT, Math.round(weight)));
  return slots.map((s) =>
    s.id === slotId ? { ...s, config: { ...s.config, slotWeight: next } } : s
  );
}

export function slotLayoutStyle(
  slot: TaskbarSlot,
  orientation: TaskbarOrientation
): { className: string; style: CSSProperties } {
  const weight = getSlotWeight(slot);
  const kind = slotKindFromWidgetType(slot.widgetType);
  if (orientation === "horizontal") {
    const minW = kind === "metric" ? 72 : kind === "chart" ? 120 : 100;
    return {
      className: "relative min-h-0 min-w-0",
      style: { flex: `${weight} 1 0`, minWidth: minW, alignSelf: "stretch" }
    };
  }
  const minH = (kind === "chart" ? 100 : kind === "alerts" ? 88 : 64) * weight;
  return {
    className: "relative w-full min-w-0 shrink-0",
    style: { minHeight: minH, height: minH }
  };
}

export const MAX_TASKBAR_SLOTS = 6;

export const COMPOSITE_SLOT_KINDS: CompositeSlotKind[] = ["metric", "chart", "alerts"];

export function slotKindFromWidgetType(widgetType: string): CompositeSlotKind {
  if (widgetType === "alerts.feed") return "alerts";
  if (widgetType.startsWith("chart.")) return "chart";
  return "metric";
}

export function defaultConfigForSlotKind(
  kind: CompositeSlotKind,
  orientation: TaskbarOrientation
): { widgetType: string; config: Record<string, unknown> } {
  const compact = orientation === "horizontal";
  switch (kind) {
    case "chart":
      return {
        widgetType: "chart.performance",
        config: {
          chartMetrics: ["spend", "roas"],
          chartStyle: "area",
          barLayout: "vertical",
          slotWeight: defaultSlotWeight("chart")
        }
      };
    case "alerts":
      return {
        widgetType: "alerts.feed",
        config: { density: compact ? "inline" : "stacked", slotWeight: defaultSlotWeight("alerts") }
      };
    default:
      return {
        widgetType: "metrics.card",
        config: {
          metricKey: "spend",
          cardStyle: compact ? "compact" : "centered",
          slotWeight: defaultSlotWeight("metric")
        }
      };
  }
}

export function createCompositeSlot(
  kind: CompositeSlotKind,
  orientation: TaskbarOrientation
): TaskbarSlot {
  const { widgetType, config } = defaultConfigForSlotKind(kind, orientation);
  return {
    id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    widgetType,
    config
  };
}

/** @deprecated use createCompositeSlot */
export function createTaskbarSlot(metricKey: MetricKey, compact = true): TaskbarSlot {
  return {
    id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    widgetType: `metric.single.${metricKey}`,
    config: { cardStyle: compact ? "compact" : "centered" }
  };
}

export function normalizeTaskbarSlots(value: unknown): TaskbarSlot[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((s) => s && typeof s === "object" && typeof (s as TaskbarSlot).widgetType === "string")
    .slice(0, MAX_TASKBAR_SLOTS)
    .map((s) => {
      const slot = s as TaskbarSlot;
      return {
        id: slot.id || `slot-${Math.random().toString(36).slice(2, 9)}`,
        widgetType: slot.widgetType,
        config: slot.config ?? {}
      };
    });
}

export function remapSlotsForOrientation(
  slots: TaskbarSlot[],
  orientation: TaskbarOrientation
): TaskbarSlot[] {
  const compact = orientation === "horizontal";
  return slots.map((s) => {
    const kind = slotKindFromWidgetType(s.widgetType);
    if (kind === "metric") {
      return {
        ...s,
        config: { ...s.config, cardStyle: compact ? "compact" : "centered" }
      };
    }
    if (kind === "alerts") {
      return {
        ...s,
        config: { ...s.config, density: compact ? "inline" : "stacked" }
      };
    }
    return s;
  });
}

export function updateSlotConfig(
  slots: TaskbarSlot[],
  slotId: string,
  patch: Record<string, unknown>
): TaskbarSlot[] {
  return slots.map((s) => (s.id === slotId ? { ...s, config: { ...s.config, ...patch } } : s));
}

export function appendCompositeSlot(
  slots: TaskbarSlot[],
  kind: CompositeSlotKind,
  orientation: TaskbarOrientation
): TaskbarSlot[] {
  if (slots.length >= MAX_TASKBAR_SLOTS) return slots;
  return [...slots, createCompositeSlot(kind, orientation)];
}

export function updateSlotKind(
  slots: TaskbarSlot[],
  slotId: string,
  kind: CompositeSlotKind,
  orientation: TaskbarOrientation
): TaskbarSlot[] {
  const { widgetType, config } = defaultConfigForSlotKind(kind, orientation);
  return slots.map((s) =>
    s.id === slotId
      ? {
          ...s,
          widgetType,
          config: {
            ...config,
            slotWeight: getSlotWeight(s)
          }
        }
      : s
  );
}

export function slotFlexStyle(
  kind: CompositeSlotKind,
  orientation: TaskbarOrientation
): { className: string; minHeight?: number } {
  if (orientation === "horizontal") {
    switch (kind) {
      case "chart":
        return { className: "flex-[2] min-w-[140px]", minHeight: 88 };
      case "alerts":
        return { className: "flex-[2] min-w-[130px]", minHeight: 88 };
      default:
        return { className: "flex-1 min-w-[90px]", minHeight: 72 };
    }
  }
  switch (kind) {
    case "chart":
      return { className: "w-full shrink-0", minHeight: 150 };
    case "alerts":
      return { className: "w-full shrink-0", minHeight: 110 };
    default:
      return { className: "w-full shrink-0", minHeight: 100 };
  }
}
