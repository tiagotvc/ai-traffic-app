import type { ExtendedChartStyle } from "@/lib/dashboard/slot-visual-config";

export type ChartTier = "basic" | "premium";
export type ChartDataShape =
  | "timeSeries"
  | "distribution"
  | "bullet"
  | "heatmap"
  | "scatter"
  | "correlation";

export type ChartTypeMeta = {
  id: ExtendedChartStyle;
  tier: ChartTier;
  dataShape: ChartDataShape;
  i18nKey: string;
  /** Standalone widget type when not embedded in multiChart. */
  widgetType?: string;
};

export const CHART_TYPE_REGISTRY: ChartTypeMeta[] = [
  { id: "area", tier: "basic", dataShape: "timeSeries", i18nKey: "configChartStyleArea" },
  { id: "line", tier: "basic", dataShape: "timeSeries", i18nKey: "configChartStyleLine" },
  { id: "bar", tier: "basic", dataShape: "timeSeries", i18nKey: "configChartStyleBar" },
  { id: "composed", tier: "premium", dataShape: "timeSeries", i18nKey: "configChartStyleComposed" },
  { id: "pie", tier: "premium", dataShape: "timeSeries", i18nKey: "configChartStylePie" },
  { id: "donut", tier: "premium", dataShape: "timeSeries", i18nKey: "configChartStyleDonut" },
  { id: "radar", tier: "premium", dataShape: "timeSeries", i18nKey: "configChartStyleRadar", widgetType: "advanced.radar" },
  { id: "pareto", tier: "premium", dataShape: "distribution", i18nKey: "configChartStylePareto", widgetType: "advanced.pareto" },
  { id: "bullet", tier: "premium", dataShape: "bullet", i18nKey: "configChartStyleBullet", widgetType: "premium.bullet" },
  { id: "boxplot", tier: "premium", dataShape: "distribution", i18nKey: "configChartStyleBoxplot", widgetType: "advanced.boxplot" }
];

export const BASIC_CHART_TYPE_IDS = CHART_TYPE_REGISTRY.filter((c) => c.tier === "basic").map((c) => c.id);
export const PREMIUM_CHART_TYPE_IDS = CHART_TYPE_REGISTRY.filter((c) => c.tier === "premium").map((c) => c.id);

export function getChartTypeMeta(id: ExtendedChartStyle): ChartTypeMeta | undefined {
  return CHART_TYPE_REGISTRY.find((c) => c.id === id);
}

export function isPremiumChartType(id: ExtendedChartStyle): boolean {
  return getChartTypeMeta(id)?.tier === "premium";
}

export function chartTypesForBuilder(advancedUnlocked: boolean): ChartTypeMeta[] {
  return CHART_TYPE_REGISTRY.filter((c) => c.tier === "basic" || advancedUnlocked);
}
