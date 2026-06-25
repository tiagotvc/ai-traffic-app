import type { PeriodState } from "@/components/PeriodFilter";
import {
  isExtendedPeriodPreset,
  periodStateFromExtendedPreset,
  type ExtendedPeriodPreset
} from "@/lib/dashboard/extended-period";
import type { PeriodPreset } from "@/lib/report-period";
import { normalizeTaskbarSlots } from "@/lib/dashboard/taskbar-config";
import type { WidgetInstanceDto } from "@/lib/dashboard/widget-catalog";

/** Presets disponíveis no nível do widget (comparativos lado a lado). */
export const WIDGET_PERIOD_PRESETS: PeriodPreset[] = ["last7", "last14", "last30", "thisMonth"];

export function isWidgetPeriodPreset(value: string): value is PeriodPreset {
  return WIDGET_PERIOD_PRESETS.includes(value as PeriodPreset);
}

/** `null` = usa o filtro global do CommandStrip. */
export function parseWidgetPeriod(config: Record<string, unknown>): ExtendedPeriodPreset | null {
  const raw = config.periodPreset;
  if (!raw || raw === "global") return null;
  if (typeof raw === "string" && isExtendedPeriodPreset(raw)) return raw;
  if (typeof raw === "string" && isWidgetPeriodPreset(raw)) return raw;
  return null;
}

export function periodStateFromWidgetPreset(preset: PeriodPreset | ExtendedPeriodPreset): PeriodState {
  if (isExtendedPeriodPreset(preset)) {
    return periodStateFromExtendedPreset(preset);
  }
  return { preset, since: "", until: "" };
}

export function widgetSupportsPeriod(widgetType: string): boolean {
  return (
    widgetType === "metrics.card" ||
    widgetType.startsWith("metric.single.") ||
    widgetType === "metrics.heroKpis" ||
    widgetType === "metrics.quickPills" ||
    widgetType.startsWith("chart.") ||
    widgetType.startsWith("app.") ||
    widgetType === "premium.multiChart" ||
    widgetType === "layout.taskbar" ||
    widgetType === "premium.metricMatrix"
  );
}

export function configHasWidgetPeriod(config: Record<string, unknown>): boolean {
  return parseWidgetPeriod(config) !== null;
}

export function layoutHasWidgetPeriodOverrides(widgets: WidgetInstanceDto[]): boolean {
  return widgets.some((w) => {
    if (!w.visible) return false;
    if (configHasWidgetPeriod(w.config)) return true;
    if (w.widgetType === "layout.taskbar" || w.widgetType === "premium.metricMatrix") {
      return normalizeTaskbarSlots(w.config.slots).some((s) => configHasWidgetPeriod(s.config));
    }
    return false;
  });
}
