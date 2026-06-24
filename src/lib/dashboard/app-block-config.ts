import type { ChartBarLayout } from "@/lib/dashboard/chart-metrics";
import type { ExtendedPeriodPreset } from "@/lib/dashboard/extended-period";
import type { ExtendedChartStyle, SlotVisualConfig } from "@/lib/dashboard/slot-visual-config";
import type { MetricKey } from "@/lib/dashboard-metrics";

export type AppBlockIntent = "analyze" | "goal" | "table" | "filters" | "compound";

export type TableStylePreset = "minimal" | "striped" | "bordered" | "premium" | "compact";

export type TableHeaderStyle = "default" | "accent" | "dark";

export type TableDensity = "compact" | "default" | "comfortable";

export type TableTextAlign = "left" | "center" | "right";

export type TableBorderRadius = "none" | "sm" | "md" | "lg";

export type TableRowStriping = "off" | "zebra" | "custom";

export type TableColumnFormat = "auto" | "currency" | "number" | "percent" | "integer" | "decimal";

export type TableColumnFormula =
  | { kind: "divide"; numerator: MetricKey; denominator: MetricKey }
  | { kind: "multiply"; left: MetricKey; right: MetricKey }
  | { kind: "subtract"; left: MetricKey; right: MetricKey }
  | { kind: "ratio_percent"; numerator: MetricKey; denominator: MetricKey }
  | { kind: "custom"; expression: string };

export type TableColumnDef = {
  id: string;
  label?: string;
  kind: "metric" | "calculated";
  metricKey?: MetricKey;
  formula?: TableColumnFormula;
  format?: TableColumnFormat;
  align?: TableTextAlign;
  decimals?: number;
};

export type KpiCardStyle = "default" | "compact" | "elevated";

export type FilterLayoutStyle = "bar" | "card";

export type AnalyzeDisplayMode = "values" | "chart" | "both";

export type TableEntity = "clients" | "campaigns" | "creatives" | "accounts";

export type TableBlockFilter = {
  field: string;
  op: "gte" | "lte" | "eq";
  value: number | string;
};

export type AnalyzeBlockConfig = {
  intent: "analyze";
  metricKeys: MetricKey[];
  periodPreset: ExtendedPeriodPreset;
  comparePreviousPeriod: boolean;
  displayMode: AnalyzeDisplayMode;
  chartStyle?: ExtendedChartStyle;
  chartMetrics?: MetricKey[];
  barLayout?: ChartBarLayout;
  visual?: SlotVisualConfig;
  kpiStyle?: KpiCardStyle;
};

export type GoalBlockConfig = {
  intent: "goal";
  metricKey: MetricKey;
  operator: "lte" | "gte";
  targetValue: number;
  periodPreset: ExtendedPeriodPreset;
  alertAtPercent?: number;
  pulseAtLimit?: boolean;
  showSparkline?: boolean;
};

export type TableBlockConfig = {
  intent: "table";
  entity: TableEntity;
  columns: MetricKey[];
  columnDefs?: TableColumnDef[];
  filters: TableBlockFilter[];
  sortColumn?: MetricKey | "name";
  sortColumnId?: string;
  sortDirection?: "asc" | "desc";
  sortEnabled?: boolean;
  userSortable?: boolean;
  topN?: number;
  periodPreset: ExtendedPeriodPreset;
  tableStyle?: TableStylePreset;
  showHeader?: boolean;
  showTitle?: boolean;
  title?: string;
  headerStyle?: TableHeaderStyle;
  headerBgColor?: string;
  headerTextColor?: string;
  columnWidths?: Record<string, number>;
  density?: TableDensity;
  textAlign?: TableTextAlign;
  borderRadius?: TableBorderRadius;
  stickyHeader?: boolean;
  showRowBorders?: boolean;
  rowStriping?: TableRowStriping;
  rowColorOdd?: string;
  rowColorEven?: string;
  hoverRowColor?: string;
  borderColor?: string;
};

export type FilterBlockConfig = {
  intent: "filters";
  showClient: boolean;
  showAccount: boolean;
  showPeriod: boolean;
  showSearch?: boolean;
  showPreset?: boolean;
  clientFilter?: string;
  accountFilter?: string;
  periodPreset?: ExtendedPeriodPreset;
  searchQuery?: string;
  presetFilter?: string;
  layoutStyle?: FilterLayoutStyle;
};

export type AppBlockConfig =
  | AnalyzeBlockConfig
  | GoalBlockConfig
  | TableBlockConfig
  | FilterBlockConfig;

export function defaultAnalyzeConfig(): AnalyzeBlockConfig {
  return {
    intent: "analyze",
    metricKeys: ["spend"],
    periodPreset: "last7",
    comparePreviousPeriod: true,
    displayMode: "both",
    chartStyle: "area",
    chartMetrics: ["spend"],
    barLayout: "vertical",
    visual: { showLegend: true, legendPosition: "bottom" }
  };
}

export function defaultGoalConfig(): GoalBlockConfig {
  return {
    intent: "goal",
    metricKey: "spend",
    operator: "lte",
    targetValue: 10000,
    periodPreset: "last7",
    alertAtPercent: 80,
    pulseAtLimit: true,
    showSparkline: true
  };
}

export function defaultTableConfig(): TableBlockConfig {
  return {
    intent: "table",
    entity: "clients",
    columns: ["spend", "roas", "cpa", "conversions"],
    columnDefs: [
      { id: "spend", kind: "metric", metricKey: "spend", format: "auto" },
      { id: "roas", kind: "metric", metricKey: "roas", format: "auto" },
      { id: "cpa", kind: "metric", metricKey: "cpa", format: "auto" },
      { id: "conversions", kind: "metric", metricKey: "conversions", format: "auto" }
    ],
    filters: [],
    sortColumn: "roas",
    sortColumnId: "roas",
    sortDirection: "desc",
    sortEnabled: true,
    userSortable: false,
    topN: 25,
    periodPreset: "last30",
    tableStyle: "minimal",
    showHeader: true,
    showTitle: true,
    headerStyle: "default",
    density: "default",
    textAlign: "left",
    borderRadius: "md",
    stickyHeader: true,
    showRowBorders: true,
    rowStriping: "zebra",
    rowColorOdd: "#ffffff",
    rowColorEven: "#f8fafc"
  };
}

export function defaultFilterConfig(): FilterBlockConfig {
  return {
    intent: "filters",
    showClient: true,
    showAccount: true,
    showPeriod: true,
    showSearch: false,
    showPreset: false,
    clientFilter: "",
    accountFilter: "",
    periodPreset: "last30",
    searchQuery: "",
    presetFilter: "",
    layoutStyle: "bar"
  };
}

export function appBlockConfigToWidget(config: AppBlockConfig): {
  widgetType: string;
  config: Record<string, unknown>;
} {
  if (config.intent === "analyze") {
    return {
      widgetType: "app.analyze",
      config: {
        metricKeys: config.metricKeys,
        periodPreset: config.periodPreset,
        comparePreviousPeriod: config.comparePreviousPeriod,
        displayMode: config.displayMode,
        chartStyle: config.chartStyle ?? "area",
        chartMetrics: config.chartMetrics ?? config.metricKeys,
        barLayout: config.barLayout ?? "vertical",
        ...flattenVisual(config.visual)
      }
    };
  }
  if (config.intent === "goal") {
    return {
      widgetType: "app.goal",
      config: { ...config }
    };
  }
  if (config.intent === "filters") {
    return {
      widgetType: "app.filters",
      config: { ...config }
    };
  }
  return {
    widgetType: "app.table",
    config: { ...config }
  };
}

export function widgetConfigToAppBlock(
  widgetType: string,
  raw: Record<string, unknown>
): AppBlockConfig | null {
  if (widgetType === "app.analyze") {
    return {
      intent: "analyze",
      metricKeys: (raw.metricKeys as MetricKey[]) ?? ["spend"],
      periodPreset: (raw.periodPreset as ExtendedPeriodPreset) ?? "last7",
      comparePreviousPeriod: raw.comparePreviousPeriod !== false,
      displayMode: (raw.displayMode as AnalyzeDisplayMode) ?? "both",
      chartStyle: raw.chartStyle as ExtendedChartStyle | undefined,
      chartMetrics: raw.chartMetrics as MetricKey[] | undefined,
      barLayout: raw.barLayout as ChartBarLayout | undefined,
      visual: parseVisualFromConfig(raw)
    };
  }
  if (widgetType === "app.goal") {
    return {
      intent: "goal",
      metricKey: (raw.metricKey as MetricKey) ?? "spend",
      operator: (raw.operator as "lte" | "gte") ?? "lte",
      targetValue: Number(raw.targetValue) || 10000,
      periodPreset: (raw.periodPreset as ExtendedPeriodPreset) ?? "last7",
      alertAtPercent: Number(raw.alertAtPercent) || 80,
      pulseAtLimit: raw.pulseAtLimit !== false,
      showSparkline: raw.showSparkline !== false
    };
  }
  if (widgetType === "app.table") {
    return {
      intent: "table",
      entity: (raw.entity as TableEntity) ?? "clients",
      columns: (raw.columns as MetricKey[]) ?? ["spend", "roas"],
      columnDefs: raw.columnDefs as TableBlockConfig["columnDefs"],
      filters: (raw.filters as TableBlockFilter[]) ?? [],
      sortColumn: raw.sortColumn as MetricKey | "name" | undefined,
      sortColumnId: raw.sortColumnId as string | undefined,
      sortDirection: (raw.sortDirection as "asc" | "desc") ?? "desc",
      sortEnabled: raw.sortEnabled !== false,
      userSortable: raw.userSortable === true,
      topN: Number(raw.topN) || 25,
      periodPreset: (raw.periodPreset as ExtendedPeriodPreset) ?? "last30",
      tableStyle: raw.tableStyle as TableStylePreset | undefined,
      showHeader: raw.showHeader !== false,
      showTitle: raw.showTitle !== false,
      title: raw.title as string | undefined,
      headerStyle: raw.headerStyle as TableHeaderStyle | undefined,
      headerBgColor: raw.headerBgColor as string | undefined,
      headerTextColor: raw.headerTextColor as string | undefined,
      columnWidths: raw.columnWidths as Record<string, number> | undefined,
      density: raw.density as TableDensity | undefined,
      textAlign: raw.textAlign as TableTextAlign | undefined,
      borderRadius: raw.borderRadius as TableBorderRadius | undefined,
      stickyHeader: raw.stickyHeader !== false,
      showRowBorders: raw.showRowBorders !== false,
      rowStriping: raw.rowStriping as TableRowStriping | undefined,
      rowColorOdd: raw.rowColorOdd as string | undefined,
      rowColorEven: raw.rowColorEven as string | undefined,
      hoverRowColor: raw.hoverRowColor as string | undefined,
      borderColor: raw.borderColor as string | undefined
    };
  }
  if (widgetType === "app.filters") {
    return {
      intent: "filters",
      showClient: raw.showClient !== false,
      showAccount: raw.showAccount !== false,
      showPeriod: raw.showPeriod !== false,
      showSearch: raw.showSearch === true,
      showPreset: raw.showPreset === true,
      clientFilter: (raw.clientFilter as string) ?? "",
      accountFilter: (raw.accountFilter as string) ?? "",
      periodPreset: (raw.periodPreset as ExtendedPeriodPreset) ?? "last30",
      searchQuery: (raw.searchQuery as string) ?? "",
      presetFilter: (raw.presetFilter as string) ?? ""
    };
  }
  return null;
}

export function isAppBlockType(type: string): boolean {
  return (
    type === "app.analyze" ||
    type === "app.goal" ||
    type === "app.table" ||
    type === "app.filters"
  );
}

function flattenVisual(visual?: SlotVisualConfig): Record<string, unknown> {
  if (!visual) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(visual)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function parseVisualFromConfig(raw: Record<string, unknown>): SlotVisualConfig {
  const keys = [
    "showLegend",
    "legendPosition",
    "legendIconType",
    "customColors",
    "textColor",
    "lineStrokeWidth",
    "barThickness"
  ] as const;
  const visual: SlotVisualConfig = {};
  for (const k of keys) {
    if (raw[k] !== undefined) (visual as Record<string, unknown>)[k] = raw[k];
  }
  return visual;
}
