/** Paid dashboard widget pack — sold as add-on, not included in base plans. */
export const MASTER_BLASTER_ADDON = "master_blaster";

export const MASTER_BLASTER_WIDGET_TYPES = [
  "advanced.scatter",
  "advanced.heatmap",
  "advanced.radar",
  "advanced.pareto",
  "advanced.boxplot",
  "ai.correlation",
  "premium.multiChart",
  "premium.bullet",
  "premium.metricMatrix"
] as const;

export type MasterBlasterWidgetType = (typeof MASTER_BLASTER_WIDGET_TYPES)[number];

export function isMasterBlasterWidgetType(widgetType: string): boolean {
  return (MASTER_BLASTER_WIDGET_TYPES as readonly string[]).includes(widgetType);
}

export function isMasterBlasterAddon(addonKey: string): boolean {
  return addonKey === MASTER_BLASTER_ADDON;
}
