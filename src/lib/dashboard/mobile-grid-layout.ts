import type { Layout } from "react-grid-layout";

import { getWidgetDefinition, type WidgetInstanceDto } from "@/lib/dashboard/widget-catalog";

const GRID_COLS = 12;

const CHART_WIDGET_PREFIXES = ["chart.", "advanced.", "premium."] as const;

function isChartWidget(widgetType: string): boolean {
  return CHART_WIDGET_PREFIXES.some((p) => widgetType.startsWith(p));
}

function mobileWidgetHeight(widget: WidgetInstanceDto): number {
  const def = getWidgetDefinition(widget.widgetType);
  const base = widget.h;
  if (isChartWidget(widget.widgetType)) {
    return Math.max(base, def?.defaultH ?? 4, 4);
  }
  if (widget.widgetType === "metrics.quickPills") {
    return Math.max(base, 1);
  }
  if (widget.widgetType === "metrics.heroKpis") {
    const heroMetrics = widget.config.heroMetrics as unknown[] | undefined;
    const kpiCount = Math.min(Math.max(heroMetrics?.length ?? 6, 1), 6);
    return Math.max(base, kpiCount * 4 + 2, 6);
  }
  if (widget.widgetType === "metrics.card" || widget.widgetType.startsWith("metric.single.")) {
    const cardStyle = widget.config.cardStyle as string | undefined;
    if (cardStyle !== "compact") {
      return Math.max(base, 5);
    }
  }
  return base;
}

/** Stack dashboard widgets full-width for narrow viewports (read-only mode). */
export function stackWidgetsForMobile(widgets: WidgetInstanceDto[]): Layout {
  const sorted = [...widgets].sort((a, b) => a.y - b.y || a.x - b.x);
  let y = 0;

  return sorted.map((w) => {
    const h = mobileWidgetHeight(w);
    const item = {
      i: w.id,
      x: 0,
      y,
      w: GRID_COLS,
      h,
      minW: GRID_COLS,
      maxW: GRID_COLS,
      static: true
    };
    y += h;
    return item;
  });
}
