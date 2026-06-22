import type { MetricKey } from "@/lib/dashboard-metrics";
import { METRIC_BY_KEY } from "@/lib/dashboard-metrics";
import type { ChartStyle } from "@/lib/dashboard/widget-config";

/** Estilos básicos (grátis) + premium (Master Blaster). */
export type ExtendedChartStyle = ChartStyle | "pie" | "donut" | "radar";

export type SlotFontFamily = "system" | "heading" | "mono";
export type SlotFontSize = "sm" | "md" | "lg";
export type StrokeWeight = 1 | 2 | 3 | 4;

export type SlotVisualConfig = {
  customColors?: Partial<Record<MetricKey, string>>;
  textColor?: string;
  accentColor?: string;
  fontFamily?: SlotFontFamily;
  fontSize?: SlotFontSize;
  lineStrokeWidth?: StrokeWeight;
  barThickness?: StrokeWeight;
};

export const BASIC_CHART_STYLES: ExtendedChartStyle[] = ["area", "line", "bar"];
export const PREMIUM_CHART_STYLES: ExtendedChartStyle[] = ["pie", "donut", "radar"];

export const FONT_FAMILY_CSS: Record<SlotFontFamily, string> = {
  system: "var(--font-sans, system-ui, sans-serif)",
  heading: "var(--font-heading)",
  mono: "ui-monospace, monospace"
};

export const FONT_SIZE_CSS: Record<SlotFontSize, { label: string; value: string }> = {
  sm: { label: "sm", value: "0.75rem" },
  md: { label: "md", value: "0.875rem" },
  lg: { label: "lg", value: "1rem" }
};

export function parseExtendedChartStyle(value: unknown): ExtendedChartStyle {
  const v = String(value ?? "area");
  if (
    v === "area" ||
    v === "line" ||
    v === "bar" ||
    v === "pie" ||
    v === "donut" ||
    v === "radar"
  ) {
    return v;
  }
  return "area";
}

export function isPremiumChartStyle(style: ExtendedChartStyle): boolean {
  return PREMIUM_CHART_STYLES.includes(style);
}

export function parseSlotVisualConfig(config: Record<string, unknown>): SlotVisualConfig {
  const raw = config.visual;
  if (!raw || typeof raw !== "object") return {};
  const v = raw as SlotVisualConfig;
  return {
    customColors: v.customColors,
    textColor: typeof v.textColor === "string" ? v.textColor : undefined,
    accentColor: typeof v.accentColor === "string" ? v.accentColor : undefined,
    fontFamily: v.fontFamily,
    fontSize: v.fontSize,
    lineStrokeWidth: v.lineStrokeWidth,
    barThickness: v.barThickness
  };
}

export function mergeSlotVisual(
  config: Record<string, unknown>,
  patch: Partial<SlotVisualConfig>
): Record<string, unknown> {
  const cur = parseSlotVisualConfig(config);
  return {
    ...config,
    visual: { ...cur, ...patch }
  };
}

export function resolveMetricColor(
  key: MetricKey,
  customColors?: Partial<Record<MetricKey, string>>
): string {
  return customColors?.[key] ?? METRIC_BY_KEY[key]?.color ?? "#94a3b8";
}

export function strokeWeightToPx(weight: StrokeWeight | undefined, fallback: number): number {
  if (!weight) return fallback;
  return weight * 1.25;
}

export function barThicknessToSize(weight: StrokeWeight | undefined): number | undefined {
  if (!weight) return undefined;
  return weight * 8;
}
