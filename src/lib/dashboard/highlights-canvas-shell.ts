import type { WidgetInstanceDto } from "@/lib/dashboard/widget-catalog";

const HIGHLIGHTS_PANEL_TYPES = new Set([
  "chart.performance",
  "analytics.ageBreakdown",
  "clients.health"
]);

export function highlightsWidgetUsesPanel(widgetType: string): boolean {
  return HIGHLIGHTS_PANEL_TYPES.has(widgetType);
}

/** Ensure Destaques canvas rows are tall enough for page-style widgets. */
export function normalizeHighlightsLayoutWidgets(
  widgets: WidgetInstanceDto[]
): WidgetInstanceDto[] {
  return widgets.map((w) => {
    if (w.widgetType === "chart.performance" && w.h < 8) {
      return { ...w, h: 8 };
    }
    if (w.widgetType === "analytics.ageBreakdown" && w.h < 5) {
      return { ...w, h: 5 };
    }
    return w;
  });
}

export function highlightsLayoutNeedsNormalize(widgets: WidgetInstanceDto[]): boolean {
  const normalized = normalizeHighlightsLayoutWidgets(widgets);
  return normalized.some(
    (w, i) => w.h !== widgets[i]!.h || w.w !== widgets[i]!.w
  );
}
