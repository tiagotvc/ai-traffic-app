import {
  DEFAULT_DASHBOARD_LAYOUT,
  DEFAULT_DASHBOARD_SECTIONS,
  type DashboardLayoutPrefs
} from "@/lib/dashboard-layout-prefs";
import { DEFAULT_DASHBOARD_CHART_METRICS, type MetricKey } from "@/lib/dashboard-metrics";
import { getWidgetDefinition } from "@/lib/dashboard/widget-catalog";

/** Bump when system template layouts change (forces DB resync on next API load). */
export const SYSTEM_TEMPLATE_CATALOG_VERSION = 4;

export type SystemTemplateWidgetSpec = {
  widgetType: string;
  x: number;
  y: number;
  w: number;
  h: number;
  size?: string;
  config?: Record<string, unknown>;
};

export type SystemDashboardTemplateSpec = {
  name: string;
  category: string;
  minPlanSlug: string;
  widgets: SystemTemplateWidgetSpec[];
};

const CORE_METRICS: MetricKey[] = ["spend", "impressions", "roas", "conversions", "ctr"];
const RESULTS_METRICS: MetricKey[] = ["conversions", "messages", "roas", "cpa"];
const FUNNEL_METRICS: MetricKey[] = ["clicks", "ctr", "cpc", "conversions"];

const visualPremium = {
  lineStrokeWidth: 3,
  barThickness: 3,
  textColor: "#94a3b8",
  customColors: {
    spend: "#6366f1",
    impressions: "#8b5cf6",
    roas: "#22c55e",
    conversions: "#f59e0b",
    ctr: "#06b6d4",
    clicks: "#ec4899",
    cpc: "#ef4444"
  } as Partial<Record<MetricKey, string>>
};

const areaChart = {
  chartStyle: "area",
  chartMetrics: CORE_METRICS,
  visual: visualPremium
};

const lineChart = {
  chartStyle: "line",
  chartMetrics: ["spend", "clicks", "ctr", "cpc"] as MetricKey[],
  visual: visualPremium
};

const barChart = {
  chartStyle: "bar",
  barLayout: "vertical",
  chartMetrics: ["spend", "conversions", "messages"] as MetricKey[],
  visual: visualPremium
};

const barHorizontal = {
  chartStyle: "bar",
  barLayout: "horizontal",
  chartMetrics: ["spend", "impressions", "reach"] as MetricKey[],
  visual: visualPremium
};

const pieChart = {
  chartStyle: "pie",
  chartMetrics: RESULTS_METRICS,
  visual: visualPremium
};

const donutChart = {
  chartStyle: "donut",
  chartMetrics: ["spend", "conversions", "messages", "roas"] as MetricKey[],
  visual: visualPremium
};

const radarChart = {
  chartStyle: "radar",
  chartMetrics: FUNNEL_METRICS,
  visual: { ...visualPremium, radarFillOpacity: 0.3 }
};

const composedChart = {
  chartStyle: "composed",
  chartMetrics: ["spend", "conversions", "roas"] as MetricKey[],
  visual: {
    ...visualPremium,
    seriesStyles: { spend: "bar", conversions: "line", roas: "area" }
  }
};

export function widgetsFromLegacyLayoutPrefs(
  prefs: DashboardLayoutPrefs,
  chartMetrics: MetricKey[] = DEFAULT_DASHBOARD_CHART_METRICS
): SystemTemplateWidgetSpec[] {
  const sections = prefs.sections ?? DEFAULT_DASHBOARD_SECTIONS;
  const items: SystemTemplateWidgetSpec[] = [];
  let y = 0;

  const push = (widgetType: string, w: number, h: number, config: Record<string, unknown> = {}) => {
    const def = getWidgetDefinition(widgetType);
    items.push({
      widgetType,
      x: 0,
      y,
      w,
      h,
      size: def?.size ?? "md",
      config
    });
    y += h;
  };

  if (sections.brainShelf) push("brain.learnings", 12, 1);
  if (sections.heroKpis) {
    push("metrics.heroKpis", 12, 3, {
      heroMetrics: ["spend", "roas", "conversions"] as MetricKey[]
    });
  }
  if (sections.secondaryMetrics) push("metrics.quickPills", 12, 1);

  if (sections.chart || sections.alerts) {
    const chartY = y;
    if (sections.chart) {
      items.push({
        widgetType: "chart.performance",
        x: 0,
        y: chartY,
        w: sections.alerts ? 8 : 12,
        h: 4,
        size: "lg",
        config: { ...areaChart, periodPreset: "last30" }
      });
    }
    if (sections.alerts) {
      items.push({
        widgetType: "alerts.feed",
        x: sections.chart ? 8 : 0,
        y: chartY,
        w: sections.chart ? 4 : 12,
        h: 5,
        size: "md",
        config: { density: "stacked" }
      });
    }
    y = chartY + (sections.alerts ? 5 : 4);
  }

  if (sections.agencyHealth) {
    push("clients.health", 12, 6, { view: "full" });
  }

  if (!items.length) {
    push("metrics.heroKpis", 12, 3, { heroMetrics: ["spend", "roas", "conversions"] });
    push("chart.performance", 12, 4, areaChart);
  }

  return items;
}

export const SYSTEM_DASHBOARD_TEMPLATE_CATALOG: SystemDashboardTemplateSpec[] = [
  {
    name: "Meta Ads Performance",
    category: "performance",
    minPlanSlug: "advanced",
    widgets: [
      { widgetType: "brain.learnings", x: 0, y: 0, w: 12, h: 1, size: "sm", config: {} },
      {
        widgetType: "metrics.heroKpis",
        x: 0,
        y: 2,
        w: 12,
        h: 3,
        size: "sm",
        config: { heroMetrics: ["spend", "roas", "conversions"] }
      },
      { widgetType: "metrics.quickPills", x: 0, y: 5, w: 12, h: 1, size: "sm", config: {} },
      {
        widgetType: "chart.performance",
        x: 0,
        y: 6,
        w: 8,
        h: 4,
        size: "lg",
        config: { ...areaChart, periodPreset: "last30" }
      },
      {
        widgetType: "alerts.feed",
        x: 8,
        y: 6,
        w: 4,
        h: 5,
        size: "md",
        config: { density: "stacked" }
      },
      {
        widgetType: "premium.multiChart",
        x: 0,
        y: 11,
        w: 6,
        h: 4,
        size: "lg",
        config: { ...lineChart, periodPreset: "last14" }
      },
      {
        widgetType: "advanced.heatmap",
        x: 6,
        y: 11,
        w: 6,
        h: 4,
        size: "lg",
        config: { heatmapMetric: "conversions" }
      },
      {
        widgetType: "clients.health",
        x: 0,
        y: 15,
        w: 12,
        h: 2,
        size: "sm",
        config: { view: "cards" }
      }
    ]
  },
  {
    name: "KPIs + Gráfico",
    category: "performance",
    minPlanSlug: "advanced",
    widgets: [
      {
        widgetType: "metrics.heroKpis",
        x: 0,
        y: 0,
        w: 12,
        h: 3,
        size: "sm",
        config: { heroMetrics: ["spend", "roas", "conversions"] }
      },
      {
        widgetType: "metrics.quickPills",
        x: 0,
        y: 3,
        w: 12,
        h: 1,
        size: "sm",
        config: {}
      },
      {
        widgetType: "chart.performance",
        x: 0,
        y: 4,
        w: 8,
        h: 4,
        size: "lg",
        config: { ...lineChart, periodPreset: "last30" }
      },
      {
        widgetType: "alerts.feed",
        x: 8,
        y: 4,
        w: 4,
        h: 5,
        size: "md",
        config: { density: "stacked" }
      },
      {
        widgetType: "metrics.card",
        x: 0,
        y: 9,
        w: 4,
        h: 2,
        size: "sm",
        config: { metricKey: "cpa", cardStyle: "compact", periodPreset: "last7" }
      },
      {
        widgetType: "metrics.card",
        x: 4,
        y: 9,
        w: 4,
        h: 2,
        size: "sm",
        config: { metricKey: "ctr", cardStyle: "compact", periodPreset: "last30" }
      },
      {
        widgetType: "metrics.card",
        x: 8,
        y: 9,
        w: 4,
        h: 2,
        size: "sm",
        config: { metricKey: "messages", cardStyle: "compact" }
      }
    ]
  },
  {
    name: "Gráficos comparativos",
    category: "charts",
    minPlanSlug: "advanced",
    widgets: [
      {
        widgetType: "premium.multiChart",
        x: 0,
        y: 0,
        w: 4,
        h: 4,
        size: "lg",
        config: donutChart
      },
      {
        widgetType: "premium.multiChart",
        x: 4,
        y: 0,
        w: 4,
        h: 4,
        size: "lg",
        config: pieChart
      },
      {
        widgetType: "premium.multiChart",
        x: 8,
        y: 0,
        w: 4,
        h: 4,
        size: "lg",
        config: radarChart
      },
      {
        widgetType: "chart.performance",
        x: 0,
        y: 4,
        w: 12,
        h: 4,
        size: "lg",
        config: areaChart
      },
      {
        widgetType: "chart.roasCpa",
        x: 0,
        y: 8,
        w: 6,
        h: 3,
        size: "lg",
        config: { chartStyle: "line", visual: visualPremium }
      },
      {
        widgetType: "chart.spendConversions",
        x: 6,
        y: 8,
        w: 6,
        h: 3,
        size: "lg",
        config: barHorizontal
      },
      {
        widgetType: "chart.compare",
        x: 0,
        y: 11,
        w: 6,
        h: 3,
        size: "lg",
        config: {
          metricA: "ctr",
          metricB: "cpc",
          chartStyle: "area",
          visual: visualPremium
        }
      },
      {
        widgetType: "advanced.scatter",
        x: 6,
        y: 11,
        w: 6,
        h: 3,
        size: "lg",
        config: { metricX: "spend", metricY: "roas", pointSize: "medium" }
      }
    ]
  },
  {
    name: "Agency Brain",
    category: "agency-brain",
    minPlanSlug: "advanced",
    widgets: [
      { widgetType: "ai.agencyBrain", x: 0, y: 0, w: 12, h: 5, size: "xl", config: {} },
      { widgetType: "ai.recentLearnings", x: 0, y: 5, w: 6, h: 3, size: "lg", config: {} },
      {
        widgetType: "chart.performance",
        x: 6,
        y: 5,
        w: 6,
        h: 3,
        size: "lg",
        config: barChart
      },
      {
        widgetType: "ai.correlation",
        x: 0,
        y: 8,
        w: 6,
        h: 4,
        size: "lg",
        config: { metricA: "spend", metricB: "conversions", showTrend: true }
      },
      {
        widgetType: "alerts.feed",
        x: 6,
        y: 8,
        w: 6,
        h: 4,
        size: "md",
        config: { density: "inline" }
      }
    ]
  },
  {
    name: "Executivo",
    category: "executive",
    minPlanSlug: "agency",
    widgets: [
      {
        widgetType: "metrics.heroKpis",
        x: 0,
        y: 0,
        w: 12,
        h: 3,
        size: "sm",
        config: { heroMetrics: ["spend", "roas", "conversions"] }
      },
      { widgetType: "ai.accountHealth", x: 0, y: 3, w: 4, h: 3, size: "md", config: {} },
      {
        widgetType: "premium.multiChart",
        x: 4,
        y: 3,
        w: 8,
        h: 4,
        size: "lg",
        config: { ...areaChart, periodPreset: "last30" }
      },
      {
        widgetType: "chart.spendRoas",
        x: 0,
        y: 7,
        w: 6,
        h: 3,
        size: "lg",
        config: { chartStyle: "line", visual: visualPremium }
      },
      {
        widgetType: "metrics.card",
        x: 6,
        y: 7,
        w: 3,
        h: 3,
        size: "sm",
        config: { metricKey: "cpa", cardStyle: "centered" }
      },
      {
        widgetType: "metrics.card",
        x: 9,
        y: 7,
        w: 3,
        h: 3,
        size: "sm",
        config: { metricKey: "cpm", cardStyle: "centered" }
      }
    ]
  },
  {
    name: "Clientes",
    category: "clients",
    minPlanSlug: "advanced",
    widgets: [
      {
        widgetType: "metrics.heroKpis",
        x: 0,
        y: 0,
        w: 12,
        h: 2,
        size: "sm",
        config: { heroMetrics: ["spend", "roas", "conversions"] }
      },
      {
        widgetType: "clients.health",
        x: 0,
        y: 2,
        w: 8,
        h: 6,
        size: "lg",
        config: { view: "full" }
      },
      {
        widgetType: "premium.multiChart",
        x: 8,
        y: 2,
        w: 4,
        h: 3,
        size: "md",
        config: donutChart
      },
      {
        widgetType: "advanced.heatmap",
        x: 8,
        y: 5,
        w: 4,
        h: 3,
        size: "md",
        config: { heatmapMetric: "spend" }
      },
      {
        widgetType: "alerts.feed",
        x: 0,
        y: 8,
        w: 12,
        h: 3,
        size: "md",
        config: { density: "inline" }
      }
    ]
  },
  {
    name: "Minimal",
    category: "minimal",
    minPlanSlug: "advanced",
    widgets: [
      {
        widgetType: "metrics.heroKpis",
        x: 0,
        y: 0,
        w: 12,
        h: 3,
        size: "sm",
        config: { heroMetrics: ["spend", "roas", "ctr"] }
      },
      {
        widgetType: "chart.performance",
        x: 0,
        y: 3,
        w: 8,
        h: 4,
        size: "lg",
        config: lineChart
      },
      {
        widgetType: "metrics.card",
        x: 8,
        y: 3,
        w: 4,
        h: 4,
        size: "sm",
        config: { metricKey: "conversions", cardStyle: "centered" }
      }
    ]
  },
  {
    name: "Premium Studio",
    category: "premium",
    minPlanSlug: "advanced",
    widgets: [
      {
        widgetType: "layout.taskbar",
        x: 0,
        y: 0,
        w: 12,
        h: 3,
        size: "lg",
        config: {
          orientation: "horizontal",
          slots: [
            {
              id: "tpl-slot-1",
              widgetType: "metrics.card",
              config: { metricKey: "spend", cardStyle: "compact", slotWeight: 1 }
            },
            {
              id: "tpl-slot-2",
              widgetType: "chart.performance",
              config: {
                chartStyle: "donut",
                chartMetrics: ["spend", "roas", "conversions"],
                slotWeight: 3,
                visual: visualPremium
              }
            },
            {
              id: "tpl-slot-3",
              widgetType: "alerts.feed",
              config: { density: "inline", slotWeight: 2 }
            }
          ]
        }
      },
      {
        widgetType: "premium.multiChart",
        x: 0,
        y: 3,
        w: 6,
        h: 4,
        size: "lg",
        config: composedChart
      },
      {
        widgetType: "advanced.radar",
        x: 6,
        y: 3,
        w: 6,
        h: 4,
        size: "lg",
        config: radarChart
      },
      {
        widgetType: "advanced.pareto",
        x: 0,
        y: 7,
        w: 4,
        h: 3,
        size: "md",
        config: { metric: "spend", sortDescending: true }
      },
      {
        widgetType: "premium.bullet",
        x: 4,
        y: 7,
        w: 4,
        h: 2,
        size: "sm",
        config: { metric: "roas", targetValue: 3 }
      },
      {
        widgetType: "advanced.boxplot",
        x: 8,
        y: 7,
        w: 4,
        h: 3,
        size: "md",
        config: { metric: "cpa", boxPlotGroupBy: "dayOfWeek" }
      },
      {
        widgetType: "advanced.scatter",
        x: 0,
        y: 10,
        w: 6,
        h: 3,
        size: "lg",
        config: { metricX: "spend", metricY: "cpa", pointSize: "large" }
      },
      {
        widgetType: "advanced.heatmap",
        x: 6,
        y: 10,
        w: 6,
        h: 3,
        size: "lg",
        config: { heatmapMetric: "roas", cellScale: "auto", heatmapColorScale: "linear" }
      }
    ]
  }
];

const BY_NAME = new Map(SYSTEM_DASHBOARD_TEMPLATE_CATALOG.map((t) => [t.name, t.widgets]));

export function getSystemTemplateWidgetsByName(name: string): SystemTemplateWidgetSpec[] {
  return BY_NAME.get(name) ?? [];
}
