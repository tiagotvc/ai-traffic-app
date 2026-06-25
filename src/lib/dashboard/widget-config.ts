import type { ChartBarLayout } from "@/lib/dashboard/chart-metrics";
import { DEFAULT_DASHBOARD_CHART_METRICS, METRIC_CATALOG, type MetricKey } from "@/lib/dashboard-metrics";
import { createCompositeSlot, normalizeTaskbarSlots, type TaskbarOrientation } from "@/lib/dashboard/taskbar-config";
import { WIDGET_PERIOD_PRESETS } from "@/lib/dashboard/widget-period";
import { DEFAULT_ALERT_WIDGET_CONFIG } from "@/lib/dashboard/alert-widget-config";
import { getWidgetDefinition } from "@/lib/dashboard/widget-catalog";

export type { ChartBarLayout };
export type { TaskbarOrientation };
export type ClientsHealthView = "full" | "cards" | "table";
export type AlertsDensity = "stacked" | "inline";
export type ChartStyle = "area" | "line" | "bar";
export type MetricCardStyle = "centered" | "compact";

export type WidgetConfigField = {
  kind: "select";
  key: string;
  labelKey: string;
  options: Array<{ value: string; labelKey: string }>;
};

const METRIC_KEY_OPTIONS = METRIC_CATALOG.map((m) => ({
  value: m.key,
  labelKey: `metric_${m.key}` as const
}));

const WIDGET_PERIOD_FIELD: WidgetConfigField = {
  kind: "select",
  key: "periodPreset",
  labelKey: "configWidgetPeriod",
  options: [
    { value: "global", labelKey: "configWidgetPeriodGlobal" },
    ...WIDGET_PERIOD_PRESETS.map((p) => ({
      value: p,
      labelKey: `configWidgetPeriod_${p}` as const
    }))
  ]
};

const CARD_STYLE_FIELD: WidgetConfigField = {
  kind: "select",
  key: "cardStyle",
  labelKey: "configCardStyle",
  options: [
    { value: "centered", labelKey: "configCardStyleCentered" },
    { value: "compact", labelKey: "configCardStyleCompact" }
  ]
};

const CHART_STYLE_FIELD: WidgetConfigField = {
  kind: "select",
  key: "chartStyle",
  labelKey: "configChartStyle",
  options: [
    { value: "area", labelKey: "configChartStyleArea" },
    { value: "line", labelKey: "configChartStyleLine" },
    { value: "bar", labelKey: "configChartStyleBar" }
  ]
};

const DUAL_CHART_COMPARE_FIELDS: WidgetConfigField[] = [
  {
    kind: "select",
    key: "metricA",
    labelKey: "configMetricA",
    options: METRIC_KEY_OPTIONS
  },
  {
    kind: "select",
    key: "metricB",
    labelKey: "configMetricB",
    options: METRIC_KEY_OPTIONS
  },
  CHART_STYLE_FIELD
];

export const WIDGET_CONFIG_FIELDS: Record<string, WidgetConfigField[]> = {
  "metrics.card": [
    {
      kind: "select",
      key: "metricKey",
      labelKey: "configMetricKey",
      options: METRIC_KEY_OPTIONS
    },
    WIDGET_PERIOD_FIELD,
    CARD_STYLE_FIELD
  ],
  "clients.health": [
    {
      kind: "select",
      key: "view",
      labelKey: "configClientsView",
      options: [
        { value: "full", labelKey: "configClientsViewFull" },
        { value: "cards", labelKey: "configClientsViewCards" },
        { value: "table", labelKey: "configClientsViewTable" }
      ]
    }
  ],
  "alerts.feed": [
    {
      kind: "select",
      key: "density",
      labelKey: "configAlertsDensity",
      options: [
        { value: "stacked", labelKey: "configAlertsDensityStacked" },
        { value: "inline", labelKey: "configAlertsDensityInline" }
      ]
    }
  ],
  "chart.performance": [CHART_STYLE_FIELD, WIDGET_PERIOD_FIELD],
  "chart.compare": DUAL_CHART_COMPARE_FIELDS,
  "chart.roasCpa": [CHART_STYLE_FIELD],
  "chart.spendConversions": [CHART_STYLE_FIELD],
  "chart.impressionsClicks": [CHART_STYLE_FIELD],
  "chart.ctrCpc": [CHART_STYLE_FIELD],
  "chart.spendRoas": [CHART_STYLE_FIELD],
  "chart.reachFrequency": [CHART_STYLE_FIELD],
  "chart.cpmCpa": [CHART_STYLE_FIELD],
  "advanced.scatter": [
    { kind: "select", key: "metricX", labelKey: "configMetricX", options: METRIC_KEY_OPTIONS },
    { kind: "select", key: "metricY", labelKey: "configMetricY", options: METRIC_KEY_OPTIONS },
    {
      kind: "select",
      key: "pointSize",
      labelKey: "configPointSize",
      options: [
        { value: "small", labelKey: "configPointSizeSmall" },
        { value: "medium", labelKey: "configPointSizeMedium" },
        { value: "large", labelKey: "configPointSizeLarge" }
      ]
    }
  ],
  "advanced.heatmap": [
    {
      kind: "select",
      key: "heatmapMetric",
      labelKey: "configHeatmapMetric",
      options: METRIC_KEY_OPTIONS
    }
  ],
  "ai.correlation": [
    { kind: "select", key: "metricA", labelKey: "configMetricA", options: METRIC_KEY_OPTIONS },
    { kind: "select", key: "metricB", labelKey: "configMetricB", options: METRIC_KEY_OPTIONS }
  ],
  "metrics.heroKpis": [WIDGET_PERIOD_FIELD],
  "metrics.quickPills": [WIDGET_PERIOD_FIELD],
  "premium.multiChart": [CHART_STYLE_FIELD, WIDGET_PERIOD_FIELD]
};

export function getWidgetConfigFields(widgetType: string): WidgetConfigField[] {
  if (WIDGET_CONFIG_FIELDS[widgetType]) return WIDGET_CONFIG_FIELDS[widgetType]!;
  if (widgetType.startsWith("metric.single.")) {
    return [WIDGET_PERIOD_FIELD, CARD_STYLE_FIELD];
  }
  return [];
}

export function widgetHasConfigStep(widgetType: string): boolean {
  if (
    widgetType === "metrics.heroKpis" ||
    widgetType === "metrics.quickPills" ||
    widgetType === "chart.performance" ||
    widgetType === "chart.compare" ||
    widgetType === "layout.taskbar" ||
    widgetType === "premium.metricMatrix" ||
    widgetType === "premium.multiChart" ||
    widgetType === "advanced.radar" ||
    widgetType === "advanced.pareto" ||
    widgetType === "premium.bullet" ||
    widgetType === "advanced.boxplot" ||
    widgetType === "alerts.card"
  ) {
    return true;
  }
  return getWidgetConfigFields(widgetType).length > 0;
}

export function defaultWidgetConfig(widgetType: string): Record<string, unknown> {
  const def = getWidgetDefinition(widgetType);
  const base = { ...(def?.defaultConfig ?? {}) };
  if (widgetType === "chart.performance" && !base.chartMetrics) {
    base.chartMetrics = [...DEFAULT_DASHBOARD_CHART_METRICS];
  }
  if (widgetType.startsWith("metric.single.") && !base.cardStyle) {
    base.cardStyle = "centered";
  }
  if (widgetType === "layout.taskbar" || widgetType === "premium.metricMatrix") {
    if (!base.orientation) base.orientation = "horizontal";
    if (!normalizeTaskbarSlots(base.slots).length) {
      const o = (base.orientation as TaskbarOrientation) ?? "horizontal";
      base.slots = [
        createCompositeSlot("metric", o),
        createCompositeSlot("chart", o),
        createCompositeSlot("alerts", o)
      ];
    }
  }
  if (widgetType === "premium.multiChart" && !base.chartMetrics) {
    base.chartMetrics = ["spend", "roas", "conversions", "ctr"];
  }
  if (widgetType === "alerts.card") {
    return DEFAULT_ALERT_WIDGET_CONFIG as unknown as Record<string, unknown>;
  }
  return base;
}

export function resolveWidgetHeight(widgetType: string, config: Record<string, unknown>): number {
  const def = getWidgetDefinition(widgetType);
  if (widgetType === "clients.health") {
    const view = config.view as ClientsHealthView | undefined;
    if (view === "cards") return 2;
    if (view === "table") return 5;
    return 6;
  }
  if (widgetType === "alerts.feed") {
    return def?.defaultH ?? 5;
  }
  if (widgetType === "alerts.card") {
    return def?.defaultH ?? 4;
  }
  if (widgetType === "metrics.heroKpis") {
    return def?.defaultH ?? 3;
  }
  if (widgetType === "metrics.quickPills") {
    return 2;
  }
  if (widgetType === "metrics.card" || widgetType.startsWith("metric.single.")) {
    return config.cardStyle === "compact" ? 1 : 3;
  }
  if (widgetType === "layout.taskbar" || widgetType === "premium.metricMatrix") {
    const orientation = (config.orientation as TaskbarOrientation | undefined) ?? "horizontal";
    const slots = normalizeTaskbarSlots(config.slots);
    if (orientation === "vertical") {
      const h = slots.reduce((sum, s) => {
        const kind = s.widgetType === "alerts.feed" ? 2 : s.widgetType.startsWith("chart.") ? 3 : 2;
        return sum + kind;
      }, 0);
      return Math.min(10, Math.max(4, h + 1));
    }
    return 3;
  }
  if (widgetType === "premium.multiChart") {
    return def?.defaultH ?? 5;
  }
  if (widgetType.startsWith("chart.")) {
    return def?.defaultH ?? 4;
  }
  return def?.defaultH ?? 2;
}

export function resolveWidgetWidth(widgetType: string, config: Record<string, unknown>): number {
  const def = getWidgetDefinition(widgetType);
  if (widgetType === "metrics.card" || widgetType.startsWith("metric.single.")) {
    return config.cardStyle === "compact" ? 2 : 3;
  }
  if (widgetType === "layout.taskbar" || widgetType === "premium.metricMatrix") {
    const orientation = (config.orientation as TaskbarOrientation | undefined) ?? "horizontal";
    return orientation === "vertical" ? 3 : 12;
  }
  return def?.defaultW ?? 6;
}

export function resolveMetricKeyFromWidget(
  widgetType: string,
  config: Record<string, unknown>
): MetricKey {
  if (config.metricKey && typeof config.metricKey === "string") {
    return config.metricKey as MetricKey;
  }
  if (widgetType.startsWith("metric.single.")) {
    return widgetType.replace("metric.single.", "") as MetricKey;
  }
  return "spend";
}
