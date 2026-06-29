import type { DashboardLayoutPrefs, DashboardSectionKey } from "@/lib/dashboard-layout-prefs";
import type { MetricKey } from "@/lib/dashboard-metrics";
import { normalizeWidgetLayout } from "@/lib/dashboard/widget-layout-normalize";
import type { WidgetInstanceDto } from "@/lib/dashboard/widget-catalog";
import {
  isHeroKpiWidget,
  isSecondaryKpiWidget,
  syncHeroMetricsOnWidgets,
  syncSecondaryMetricsOnWidgets
} from "@/lib/dashboard/highlights-layout-widgets";

const WIDGET_SECTION: Record<string, DashboardSectionKey> = {
  "brain.learnings": "brainShelf",
  "chart.performance": "chart",
  "alerts.feed": "alerts",
  "analytics.ageBreakdown": "ageBreakdown",
  "clients.health": "agencyHealth"
};

const SECTION_WIDGET_TYPES: Partial<Record<DashboardSectionKey, string>> = {
  brainShelf: "brain.learnings",
  heroKpis: "metrics.card",
  secondaryMetrics: "metrics.card",
  chart: "chart.performance",
  alerts: "alerts.feed",
  ageBreakdown: "analytics.ageBreakdown",
  agencyHealth: "clients.health"
};

/** Sync canvas widget visibility/config from Destaques section prefs (keeps positions). */
export function applyDashboardPrefsToWidgets(
  widgets: WidgetInstanceDto[],
  prefs: DashboardLayoutPrefs,
  chartMetrics: MetricKey[]
): WidgetInstanceDto[] {
  const withVisibility = widgets.map((w) => {
    if (isHeroKpiWidget(w) || isSecondaryKpiWidget(w)) {
      return w;
    }
    const section = WIDGET_SECTION[w.widgetType];
    if (!section) return w;

    const visible = prefs.sections[section];
    const config = { ...w.config };
    if (w.widgetType === "chart.performance") {
      config.chartMetrics = chartMetrics;
    }
    return { ...w, visible, config };
  });

  const synced = syncSecondaryMetricsOnWidgets(
    syncHeroMetricsOnWidgets(withVisibility, prefs),
    prefs
  );
  return normalizeWidgetLayout(synced);
}

/** True when an enabled section has no matching widget on the canvas. */
export function highlightsCanvasNeedsReseed(
  widgets: WidgetInstanceDto[],
  prefs: DashboardLayoutPrefs
): boolean {
  for (const [section] of Object.entries(SECTION_WIDGET_TYPES) as [DashboardSectionKey, string][]) {
    if (!prefs.sections[section]) continue;
    if (section === "heroKpis") {
      if (!widgets.some(isHeroKpiWidget)) return true;
      continue;
    }
    if (section === "secondaryMetrics") {
      if (!widgets.some(isSecondaryKpiWidget)) return true;
      continue;
    }
    const widgetType = SECTION_WIDGET_TYPES[section];
    if (!widgetType) continue;
    if (!widgets.some((w) => w.widgetType === widgetType)) return true;
  }
  return widgets.length === 0;
}
