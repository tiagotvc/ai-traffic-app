import type { MetricKey } from "@/lib/dashboard-metrics";

export type WidgetSize = "xs" | "sm" | "md" | "lg" | "xl";

export type WidgetCategory =
  | "favorites"
  | "metrics"
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
    size: "lg",
    minH: 2,
    defaultH: 2,
    dataSource: "metricPrism",
    component: "HeroKpisWidget"
  }),
  def({
    type: "metrics.quickPills",
    titleKey: "quickMetrics",
    category: "metrics",
    size: "md",
    minH: 2,
    defaultH: 2,
    dataSource: "metricPrism",
    component: "QuickPillsWidget"
  }),
  def({
    type: "chart.performance",
    titleKey: "performanceChart",
    category: "charts",
    size: "lg",
    defaultH: 4,
    dataSource: "performanceChart",
    component: "PerformanceChartWidget"
  }),
  def({
    type: "alerts.feed",
    titleKey: "alertsFeed",
    category: "alerts",
    size: "md",
    defaultH: 4,
    dataSource: "alertsFeed",
    component: "AlertsFeedWidget"
  }),
  def({
    type: "clients.health",
    titleKey: "clientsHealth",
    category: "clients",
    size: "lg",
    defaultH: 4,
    dataSource: "agencyHealth",
    component: "AgencyHealthWidget"
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
      size: "sm",
      defaultH: 2,
      dataSource: "singleMetric",
      component: "SingleMetricWidget",
      defaultConfig: { metricKey }
    })
  ),
  def({
    type: "chart.roasCpa",
    titleKey: "chartRoasCpa",
    category: "charts",
    size: "lg",
    dataSource: "dualMetricChart",
    component: "DualMetricChartWidget",
    defaultConfig: { metricA: "roas", metricB: "cpa" },
    comingSoon: false
  }),
  def({
    type: "chart.spendConversions",
    titleKey: "chartSpendConversions",
    category: "charts",
    size: "lg",
    dataSource: "dualMetricChart",
    component: "DualMetricChartWidget",
    defaultConfig: { metricA: "spend", metricB: "conversions" }
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
    category: "advanced",
    size: "lg",
    dataSource: "scatterPlot",
    component: "ScatterWidget",
    comingSoon: true,
    minPlan: "agency"
  }),
  def({
    type: "advanced.heatmap",
    titleKey: "heatmap",
    category: "advanced",
    size: "lg",
    dataSource: "heatmap",
    component: "HeatmapWidget",
    comingSoon: true,
    requiredAddon: "heatmaps"
  }),
  def({
    type: "ai.correlation",
    titleKey: "aiCorrelation",
    category: "ai",
    size: "lg",
    isAiWidget: true,
    minPlan: "master",
    dataSource: "aiCorrelation",
    component: "AiCorrelationWidget",
    comingSoon: true
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
  "metrics",
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
