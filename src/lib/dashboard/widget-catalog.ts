import { MASTER_BLASTER_ADDON } from "@/lib/dashboard/master-blaster";
import type { MetricKey } from "@/lib/dashboard-metrics";

export type WidgetSize = "xs" | "sm" | "md" | "lg" | "xl";

export type WidgetCategory =
  | "favorites"
  | "premium"
  | "metrics"
  | "layouts"
  | "charts"
  | "ai"
  | "campaigns"
  | "creatives"
  | "clients"
  | "audiences"
  | "alerts"
  | "productivity"
  | "funnels"
  | "advanced"
  | "integrations";

export type DashboardAiWidgetsTier = false | "basic" | "premium" | "advanced";

export type DashboardWidgetDefinition = {
  type: string;
  titleKey: string;
  category: WidgetCategory;
  size: WidgetSize;
  minW: number;
  maxW: number;
  minH: number;
  defaultH: number;
  defaultW: number;
  isAiWidget?: boolean;
  requiredAddon?: string;
  minPlan?: "advanced" | "agency" | "master";
  dataSource: string;
  component: string;
  comingSoon?: boolean;
  defaultConfig?: Record<string, unknown>;
};

export type WidgetInstanceDto = {
  id: string;
  layoutId: string;
  widgetType: string;
  title: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  size: WidgetSize;
  visible: boolean;
  config: Record<string, unknown>;
  sortOrder: number;
};

export type LayoutDto = {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
  icon: string | null;
  sortOrder: number;
  widgets: WidgetInstanceDto[];
};

const sizePresets: Record<
  WidgetSize,
  { w: number; h: number; minW: number; maxW: number; minH: number }
> = {
  xs: { w: 3, h: 1, minW: 2, maxW: 4, minH: 1 },
  sm: { w: 4, h: 2, minW: 3, maxW: 6, minH: 1 },
  md: { w: 6, h: 2, minW: 4, maxW: 8, minH: 2 },
  lg: { w: 8, h: 3, minW: 6, maxW: 12, minH: 2 },
  xl: { w: 12, h: 4, minW: 8, maxW: 12, minH: 3 }
};

function def(
  partial: Omit<DashboardWidgetDefinition, "minW" | "maxW" | "minH" | "defaultH" | "defaultW"> &
    Partial<Pick<DashboardWidgetDefinition, "minW" | "maxW" | "minH" | "defaultH" | "defaultW">>
): DashboardWidgetDefinition {
  const preset = sizePresets[partial.size];
  return {
    minW: partial.minW ?? preset.minW,
    maxW: partial.maxW ?? preset.maxW,
    minH: partial.minH ?? preset.minH,
    defaultH: partial.defaultH ?? preset.h,
    defaultW: partial.defaultW ?? preset.w,
    ...partial
  };
}

export const WIDGET_CATALOG: DashboardWidgetDefinition[] = [
  def({
    type: "brain.learnings",
    titleKey: "brainLearnings",
    category: "ai",
    size: "lg",
    dataSource: "brainShelf",
    component: "BrainShelfWidget"
  }),
  def({
    type: "metrics.heroKpis",
    titleKey: "heroKpis",
    category: "metrics",
    size: "sm",
    minW: 3,
    maxW: 12,
    minH: 2,
    defaultH: 3,
    defaultW: 12,
    dataSource: "metricPrism",
    component: "HeroKpisWidget"
  }),
  def({
    type: "metrics.quickPills",
    titleKey: "quickMetrics",
    category: "metrics",
    size: "xs",
    minW: 3,
    maxW: 12,
    minH: 1,
    defaultH: 1,
    defaultW: 8,
    dataSource: "metricPrism",
    component: "QuickPillsWidget"
  }),
  def({
    type: "metrics.card",
    titleKey: "metricCard",
    category: "metrics",
    size: "xs",
    minW: 2,
    maxW: 6,
    minH: 2,
    defaultH: 3,
    defaultW: 3,
    dataSource: "singleMetric",
    component: "SingleMetricWidget",
    defaultConfig: { metricKey: "spend", cardStyle: "centered" }
  }),
  def({
    type: "layout.taskbar",
    titleKey: "compositeBar",
    category: "layouts",
    size: "md",
    minW: 4,
    maxW: 12,
    minH: 2,
    defaultH: 2,
    defaultW: 12,
    dataSource: "taskbar",
    component: "TaskbarWidget",
    defaultConfig: { orientation: "horizontal", slots: [] }
  }),
  def({
    type: "chart.performance",
    titleKey: "performanceChart",
    category: "charts",
    size: "lg",
    minH: 3,
    defaultH: 4,
    defaultW: 8,
    dataSource: "performanceChart",
    component: "PerformanceChartWidget",
    defaultConfig: { chartStyle: "area", chartMetrics: ["spend", "conversions"], barLayout: "vertical" }
  }),
  def({
    type: "alerts.feed",
    titleKey: "alertsFeed",
    category: "alerts",
    size: "md",
    minH: 3,
    defaultH: 5,
    dataSource: "alertsFeed",
    component: "AlertsFeedWidget",
    defaultConfig: { density: "stacked" }
  }),
  def({
    type: "clients.health",
    titleKey: "clientsHealth",
    category: "clients",
    size: "lg",
    minH: 3,
    defaultH: 6,
    dataSource: "agencyHealth",
    component: "AgencyHealthWidget",
    defaultConfig: { view: "full" }
  }),
  def({
    type: "ai.agencyBrain",
    titleKey: "agencyBrainWidget",
    category: "ai",
    size: "xl",
    defaultH: 5,
    isAiWidget: true,
    minPlan: "advanced",
    dataSource: "agencyBrainComposite",
    component: "AgencyBrainWidget"
  }),
  def({
    type: "ai.accountHealth",
    titleKey: "accountHealth",
    category: "ai",
    size: "md",
    defaultH: 3,
    isAiWidget: true,
    minPlan: "advanced",
    dataSource: "accountHealthScore",
    component: "AccountHealthWidget"
  }),
  def({
    type: "ai.recentLearnings",
    titleKey: "recentLearnings",
    category: "ai",
    size: "lg",
    defaultH: 3,
    isAiWidget: true,
    minPlan: "advanced",
    dataSource: "brainShelf",
    component: "RecentLearningsWidget"
  }),
  ...(["spend", "roas", "cpa", "ctr", "conversions"] as MetricKey[]).map((metricKey) =>
    def({
      type: `metric.single.${metricKey}`,
      titleKey: `metric_${metricKey}`,
      category: "metrics",
      size: "xs",
      minW: 2,
      maxW: 6,
      minH: 2,
      defaultH: 3,
      defaultW: 3,
      dataSource: "singleMetric",
      component: "SingleMetricWidget",
      defaultConfig: { metricKey, cardStyle: "centered" }
    })
  ),
  def({
    type: "chart.roasCpa",
    titleKey: "chartRoasCpa",
    category: "charts",
    size: "lg",
    minH: 3,
    defaultH: 4,
    dataSource: "dualMetricChart",
    component: "DualMetricChartWidget",
    defaultConfig: { metricA: "roas", metricB: "cpa", chartStyle: "area" }
  }),
  def({
    type: "chart.spendConversions",
    titleKey: "chartSpendConversions",
    category: "charts",
    size: "lg",
    minH: 3,
    defaultH: 4,
    dataSource: "dualMetricChart",
    component: "DualMetricChartWidget",
    defaultConfig: { metricA: "spend", metricB: "conversions", chartStyle: "area" }
  }),
  def({
    type: "chart.impressionsClicks",
    titleKey: "chartImpressionsClicks",
    category: "charts",
    size: "lg",
    minH: 3,
    defaultH: 4,
    dataSource: "dualMetricChart",
    component: "DualMetricChartWidget",
    defaultConfig: { metricA: "impressions", metricB: "clicks", chartStyle: "area" }
  }),
  def({
    type: "chart.ctrCpc",
    titleKey: "chartCtrCpc",
    category: "charts",
    size: "lg",
    minH: 3,
    defaultH: 4,
    dataSource: "dualMetricChart",
    component: "DualMetricChartWidget",
    defaultConfig: { metricA: "ctr", metricB: "cpc", chartStyle: "line" }
  }),
  def({
    type: "chart.spendRoas",
    titleKey: "chartSpendRoas",
    category: "charts",
    size: "lg",
    minH: 3,
    defaultH: 4,
    dataSource: "dualMetricChart",
    component: "DualMetricChartWidget",
    defaultConfig: { metricA: "spend", metricB: "roas", chartStyle: "area" }
  }),
  def({
    type: "chart.reachFrequency",
    titleKey: "chartReachFrequency",
    category: "charts",
    size: "lg",
    minH: 3,
    defaultH: 4,
    dataSource: "dualMetricChart",
    component: "DualMetricChartWidget",
    defaultConfig: { metricA: "reach", metricB: "frequency", chartStyle: "line" }
  }),
  def({
    type: "chart.cpmCpa",
    titleKey: "chartCpmCpa",
    category: "charts",
    size: "lg",
    minH: 3,
    defaultH: 4,
    dataSource: "dualMetricChart",
    component: "DualMetricChartWidget",
    defaultConfig: { metricA: "cpm", metricB: "cpa", chartStyle: "bar" }
  }),
  def({
    type: "chart.compare",
    titleKey: "chartCompare",
    category: "charts",
    size: "lg",
    minH: 3,
    defaultH: 4,
    defaultW: 8,
    dataSource: "dualMetricChart",
    component: "DualMetricChartWidget",
    defaultConfig: { metricA: "spend", metricB: "roas", chartStyle: "area", barLayout: "vertical" }
  }),
  def({
    type: "campaigns.top",
    titleKey: "topCampaigns",
    category: "campaigns",
    size: "lg",
    dataSource: "topCampaigns",
    component: "TopCampaignsWidget",
    comingSoon: true
  }),
  def({
    type: "creatives.top",
    titleKey: "topCreatives",
    category: "creatives",
    size: "lg",
    dataSource: "topCreatives",
    component: "TopCreativesWidget",
    comingSoon: true
  }),
  def({
    type: "productivity.timeline",
    titleKey: "timeline",
    category: "productivity",
    size: "md",
    dataSource: "timeline",
    component: "TimelineWidget",
    comingSoon: true
  }),
  def({
    type: "productivity.goals",
    titleKey: "goals",
    category: "productivity",
    size: "md",
    dataSource: "goals",
    component: "GoalsWidget",
    comingSoon: true
  }),
  def({
    type: "advanced.scatter",
    titleKey: "scatterPlot",
    category: "premium",
    size: "lg",
    minH: 3,
    defaultH: 4,
    defaultW: 6,
    dataSource: "scatterPlot",
    component: "ScatterWidget",
    requiredAddon: MASTER_BLASTER_ADDON,
    defaultConfig: { metricX: "spend", metricY: "roas", pointSize: "medium" }
  }),
  def({
    type: "advanced.heatmap",
    titleKey: "heatmap",
    category: "premium",
    size: "lg",
    minH: 3,
    defaultH: 4,
    defaultW: 8,
    dataSource: "heatmap",
    component: "HeatmapWidget",
    requiredAddon: MASTER_BLASTER_ADDON,
    defaultConfig: { heatmapMetric: "spend", cellScale: "auto" }
  }),
  def({
    type: "ai.correlation",
    titleKey: "aiCorrelation",
    category: "premium",
    size: "lg",
    minH: 3,
    defaultH: 4,
    defaultW: 6,
    isAiWidget: true,
    dataSource: "aiCorrelation",
    component: "AiCorrelationWidget",
    requiredAddon: MASTER_BLASTER_ADDON,
    defaultConfig: { metricA: "spend", metricB: "conversions", showTrend: true }
  }),
  def({
    type: "premium.multiChart",
    titleKey: "premiumMultiChart",
    category: "premium",
    size: "xl",
    minH: 4,
    defaultH: 5,
    defaultW: 12,
    dataSource: "performanceChart",
    component: "PerformanceChartWidget",
    requiredAddon: MASTER_BLASTER_ADDON,
    defaultConfig: {
      chartStyle: "area",
      chartMetrics: ["spend", "roas", "conversions", "ctr"],
      barLayout: "vertical"
    }
  }),
  def({
    type: "premium.metricMatrix",
    titleKey: "premiumMetricMatrix",
    category: "premium",
    size: "lg",
    minH: 3,
    defaultH: 4,
    defaultW: 12,
    dataSource: "taskbar",
    component: "TaskbarWidget",
    requiredAddon: MASTER_BLASTER_ADDON,
    defaultConfig: {
      orientation: "horizontal",
      slots: []
    }
  })
];

export const WIDGET_BY_TYPE: Record<string, DashboardWidgetDefinition> = Object.fromEntries(
  WIDGET_CATALOG.map((w) => [w.type, w])
);

export function getWidgetDefinition(type: string): DashboardWidgetDefinition | undefined {
  if (WIDGET_BY_TYPE[type]) return WIDGET_BY_TYPE[type];
  if (type.startsWith("metric.single.")) {
    const metricKey = type.replace("metric.single.", "") as MetricKey;
    return WIDGET_BY_TYPE[`metric.single.${metricKey}`];
  }
  return undefined;
}

export const WIDGET_CATEGORY_ORDER: WidgetCategory[] = [
  "favorites",
  "premium",
  "metrics",
  "layouts",
  "charts",
  "ai",
  "campaigns",
  "creatives",
  "clients",
  "audiences",
  "alerts",
  "productivity",
  "funnels",
  "advanced",
  "integrations"
];
