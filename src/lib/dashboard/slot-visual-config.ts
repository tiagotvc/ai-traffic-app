import type { MetricKey } from "@/lib/dashboard-metrics";
import { METRIC_BY_KEY } from "@/lib/dashboard-metrics";
import type { ChartStyle } from "@/lib/dashboard/widget-config";

/** Estilos básicos (grátis) + premium (Master Blaster). */
export type ExtendedChartStyle =
  | ChartStyle
  | "pie"
  | "donut"
  | "radar"
  | "composed"
  | "pareto"
  | "bullet"
  | "boxplot";

export type SeriesStyle = "bar" | "line" | "area";
export type YAxisSide = "left" | "right";
export type BoxPlotGroupBy = "campaign" | "client" | "dayOfWeek";
export type HeatmapColorScale = "auto" | "linear" | "log";
export type CellScale = "auto" | "compact" | "large";

export type RangeZone = { max: number; color: string; label?: string };

export type SlotFontFamily = "system" | "heading" | "mono";
export type SlotFontSize = "sm" | "md" | "lg";
export type StrokeWeight = 1 | 2 | 3 | 4;

export type LegendPosition = "top" | "bottom" | "left" | "right";
export type LegendIconType = "line" | "square" | "circle";

export type SlotVisualConfig = {
  customColors?: Partial<Record<MetricKey, string>>;
  textColor?: string;
  accentColor?: string;
  fontFamily?: SlotFontFamily;
  fontSize?: SlotFontSize;
  lineStrokeWidth?: StrokeWeight;
  barThickness?: StrokeWeight;
  showLegend?: boolean;
  legendPosition?: LegendPosition;
  legendIconType?: LegendIconType;
  /** Per-metric render style for composed charts. */
  seriesStyles?: Partial<Record<MetricKey, SeriesStyle>>;
  yAxisSide?: Partial<Record<MetricKey, YAxisSide>>;
  targetValue?: number;
  rangeZones?: RangeZone[];
  boxPlotGroupBy?: BoxPlotGroupBy;
  boxPlotMetric?: MetricKey;
  paretoCumulativeLineColor?: string;
  sortDescending?: boolean;
  radarFillOpacity?: number;
  radarMaxValue?: number;
  heatmapColorScale?: HeatmapColorScale;
  cellScale?: CellScale;
};

export const BASIC_CHART_STYLES: ExtendedChartStyle[] = ["area", "line", "bar"];
export const PREMIUM_CHART_STYLES: ExtendedChartStyle[] = [
  "composed",
  "pie",
  "donut",
  "radar",
  "pareto",
  "bullet",
  "boxplot"
];

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

const ALL_STYLES = new Set<string>([
  "area",
  "line",
  "bar",
  "pie",
  "donut",
  "radar",
  "composed",
  "pareto",
  "bullet",
  "boxplot"
]);

export function parseExtendedChartStyle(value: unknown): ExtendedChartStyle {
  const v = String(value ?? "area");
  if (ALL_STYLES.has(v)) return v as ExtendedChartStyle;
  return "area";
}

export function isPremiumChartStyle(style: ExtendedChartStyle): boolean {
  return PREMIUM_CHART_STYLES.includes(style);
}

export function parseSlotVisualConfig(config: Record<string, unknown>): SlotVisualConfig {
  const raw = config.visual;
  const topLegend = {
    showLegend: config.showLegend as boolean | undefined,
    legendPosition: config.legendPosition as LegendPosition | undefined,
    legendIconType: config.legendIconType as LegendIconType | undefined
  };
  if (!raw || typeof raw !== "object") {
    return {
      targetValue: typeof config.targetValue === "number" ? config.targetValue : undefined,
      boxPlotGroupBy: (config.boxPlotGroupBy as BoxPlotGroupBy | undefined) ?? undefined,
      boxPlotMetric: config.boxPlotMetric as MetricKey | undefined,
      sortDescending: config.sortDescending !== false,
      ...topLegend
    };
  }
  const v = raw as SlotVisualConfig;
  return {
    customColors: v.customColors,
    textColor: typeof v.textColor === "string" ? v.textColor : undefined,
    accentColor: typeof v.accentColor === "string" ? v.accentColor : undefined,
    fontFamily: v.fontFamily,
    fontSize: v.fontSize,
    lineStrokeWidth: v.lineStrokeWidth,
    barThickness: v.barThickness,
    showLegend: v.showLegend ?? topLegend.showLegend,
    legendPosition: v.legendPosition ?? topLegend.legendPosition,
    legendIconType: v.legendIconType ?? topLegend.legendIconType,
    seriesStyles: v.seriesStyles,
    yAxisSide: v.yAxisSide,
    targetValue:
      typeof v.targetValue === "number"
        ? v.targetValue
        : typeof config.targetValue === "number"
          ? config.targetValue
          : undefined,
    rangeZones: Array.isArray(v.rangeZones) ? v.rangeZones : undefined,
    boxPlotGroupBy: v.boxPlotGroupBy ?? (config.boxPlotGroupBy as BoxPlotGroupBy | undefined),
    boxPlotMetric: v.boxPlotMetric ?? (config.boxPlotMetric as MetricKey | undefined),
    paretoCumulativeLineColor: v.paretoCumulativeLineColor,
    sortDescending: v.sortDescending ?? config.sortDescending !== false,
    radarFillOpacity: v.radarFillOpacity,
    radarMaxValue: v.radarMaxValue,
    heatmapColorScale: v.heatmapColorScale,
    cellScale: v.cellScale ?? (config.cellScale as CellScale | undefined)
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

export function defaultSeriesStyle(index: number): SeriesStyle {
  const styles: SeriesStyle[] = ["bar", "line", "area"];
  return styles[index % styles.length];
}
