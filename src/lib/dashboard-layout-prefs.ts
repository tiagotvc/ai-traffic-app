import {
  DEFAULT_DASHBOARD_SECTION_ROW_LAYOUTS,
  normalizeSectionRowLayouts,
  type DashboardSectionRowLayouts
} from "@/lib/dashboard-section-rows";
import {
  DEFAULT_DASHBOARD_CHART_METRICS,
  METRIC_BY_KEY,
  type MetricKey
} from "@/lib/dashboard-metrics";

export type DashboardSectionKey =
  | "brainShelf"
  | "heroKpis"
  | "secondaryMetrics"
  | "chart"
  | "alerts"
  | "ageBreakdown"
  | "agencyHealth"
  | "funnel"
  | "campaignObjectives"
  | "topCampaigns"
  | "profitByCampaign"
  | "adLibrary";

export type DashboardSections = Record<DashboardSectionKey, boolean>;

export type ChartPanelSize = "compact" | "default" | "tall";

export type DashboardLayoutPrefs = {
  sections: DashboardSections;
  /** Empty = use campaign preset defaults. */
  heroMetrics: MetricKey[];
  /** Period strip metrics; empty = DEFAULT_PERIOD_METRICS. */
  periodMetrics: MetricKey[];
  /** Custom section order; missing keys append defaults at the end. */
  sectionOrder: DashboardSectionKey[];
  chartSize: ChartPanelSize;
  /** Side-by-side vs stacked when paired sections are adjacent. */
  sectionRowLayouts: DashboardSectionRowLayouts;
};

export const DASHBOARD_SECTION_KEYS: DashboardSectionKey[] = [
  "brainShelf",
  "heroKpis",
  "secondaryMetrics",
  "chart",
  "alerts",
  "ageBreakdown",
  "agencyHealth",
  "funnel",
  "campaignObjectives",
  "topCampaigns",
  "profitByCampaign",
  "adLibrary"
];

/**
 * Seções oferecidas na personalização do dashboard (v1).
 * "alerts" e "agencyHealth" foram removidas do dashboard e ficam reservadas
 * apenas para reuso no módulo Visão; por isso não aparecem aqui.
 */
export const DASHBOARD_AVAILABLE_SECTION_KEYS: DashboardSectionKey[] = [
  "brainShelf",
  "heroKpis",
  "secondaryMetrics",
  "chart",
  "ageBreakdown",
  "funnel",
  "campaignObjectives",
  "topCampaigns",
  "profitByCampaign",
  "adLibrary"
];

export const DEFAULT_DASHBOARD_SECTION_ORDER: DashboardSectionKey[] = [
  "brainShelf",
  "heroKpis",
  "secondaryMetrics",
  "chart",
  "ageBreakdown",
  "funnel",
  "campaignObjectives",
  "topCampaigns",
  "profitByCampaign",
  "adLibrary",
  "alerts",
  "agencyHealth"
];

export const DEFAULT_DASHBOARD_SECTIONS: DashboardSections = {
  brainShelf: true,
  heroKpis: true,
  secondaryMetrics: true,
  chart: true,
  alerts: true,
  ageBreakdown: true,
  agencyHealth: true,
  funnel: true,
  campaignObjectives: true,
  topCampaigns: true,
  profitByCampaign: true,
  adLibrary: true
};

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayoutPrefs = {
  sections: { ...DEFAULT_DASHBOARD_SECTIONS },
  heroMetrics: [],
  periodMetrics: [],
  sectionOrder: [...DEFAULT_DASHBOARD_SECTION_ORDER],
  chartSize: "default",
  sectionRowLayouts: { ...DEFAULT_DASHBOARD_SECTION_ROW_LAYOUTS }
};

export const MAX_HERO_METRICS = 10;

/** Period strip under hero — 5 cards matching hero KPI style (2 rows of 5 on xl). */
export const MAX_PERIOD_METRICS = 5;

export const DEFAULT_PERIOD_METRICS: MetricKey[] = [
  "impressions",
  "messages",
  "roas",
  "cpa",
  "frequency"
];

/** Default hero row when user prefs are empty (Destaques v2 — up to 10 KPI cards, 5+5 grid). */
export const DEFAULT_DASHBOARD_HERO_METRICS: MetricKey[] = [
  "spend",
  "ctr",
  "reach",
  "conversions",
  "clicks",
  "cpc",
  "roas",
  "cpm",
  "impressions",
  "messages"
];

export const CHART_PANEL_MIN_HEIGHT: Record<ChartPanelSize, number> = {
  compact: 260,
  default: 300,
  tall: 340
};

/** Default chart plot height for Destaques page variant (px). */
export const DASHBOARD_PAGE_CHART_HEIGHT: Record<ChartPanelSize, number> = {
  compact: 240,
  default: 300,
  tall: 340
};

/** localStorage key for selected Performance chart metrics (Destaques). */
export const DASHBOARD_CHART_METRICS_STORAGE_KEY = "orion-highlights-chart-metrics";

export function normalizeChartMetrics(raw: unknown, fallback: MetricKey[] = DEFAULT_DASHBOARD_CHART_METRICS): MetricKey[] {
  if (!Array.isArray(raw)) return [...fallback];
  const valid = raw.filter(
    (k): k is MetricKey => typeof k === "string" && k in METRIC_BY_KEY
  );
  const unique = [...new Set(valid)];
  return unique.length ? unique.slice(0, 3) : [...fallback];
}

export function normalizeSectionOrder(raw: unknown): DashboardSectionKey[] {
  if (!Array.isArray(raw)) return [...DEFAULT_DASHBOARD_SECTION_ORDER];
  const valid = raw.filter(
    (key): key is DashboardSectionKey =>
      typeof key === "string" && DASHBOARD_SECTION_KEYS.includes(key as DashboardSectionKey)
  );
  const seen = new Set<DashboardSectionKey>();
  const ordered: DashboardSectionKey[] = [];
  for (const key of valid) {
    if (seen.has(key)) continue;
    seen.add(key);
    ordered.push(key);
  }
  for (const key of DEFAULT_DASHBOARD_SECTION_ORDER) {
    if (!seen.has(key)) ordered.push(key);
  }
  return ordered;
}

export function normalizeChartPanelSize(raw: unknown): ChartPanelSize {
  if (raw === "compact" || raw === "tall" || raw === "default") return raw;
  return "default";
}

export function normalizeDashboardHeroMetrics(raw: unknown): MetricKey[] {
  if (!Array.isArray(raw)) return [];
  const valid = raw.filter(
    (k): k is MetricKey => typeof k === "string" && k in METRIC_BY_KEY
  );
  return [...new Set(valid)].slice(0, MAX_HERO_METRICS);
}

export function normalizePeriodMetrics(raw: unknown): MetricKey[] {
  if (!Array.isArray(raw)) return [];
  const valid = raw.filter(
    (k): k is MetricKey => typeof k === "string" && k in METRIC_BY_KEY
  );
  return [...new Set(valid)].slice(0, MAX_PERIOD_METRICS);
}

export function resolvePeriodMetricKeys(userPeriodMetrics: MetricKey[]): MetricKey[] {
  if (userPeriodMetrics.length > 0) return userPeriodMetrics.slice(0, MAX_PERIOD_METRICS);
  return DEFAULT_PERIOD_METRICS.slice(0, MAX_PERIOD_METRICS);
}

export function normalizeDashboardLayout(raw: unknown): DashboardLayoutPrefs {
  if (!raw || typeof raw !== "object") {
    return {
      sections: { ...DEFAULT_DASHBOARD_SECTIONS },
      heroMetrics: [],
      periodMetrics: [],
      sectionOrder: [...DEFAULT_DASHBOARD_SECTION_ORDER],
      chartSize: "default",
      sectionRowLayouts: { ...DEFAULT_DASHBOARD_SECTION_ROW_LAYOUTS }
    };
  }

  const obj = raw as Record<string, unknown>;
  const sectionsRaw = obj.sections;
  const sections = { ...DEFAULT_DASHBOARD_SECTIONS };

  if (sectionsRaw && typeof sectionsRaw === "object") {
    for (const key of DASHBOARD_SECTION_KEYS) {
      const value = (sectionsRaw as Record<string, unknown>)[key];
      if (typeof value === "boolean") sections[key] = value;
    }
  }

  return {
    sections,
    heroMetrics: normalizeDashboardHeroMetrics(obj.heroMetrics),
    periodMetrics: normalizePeriodMetrics(obj.periodMetrics),
    sectionOrder: normalizeSectionOrder(obj.sectionOrder),
    chartSize: normalizeChartPanelSize(obj.chartSize),
    sectionRowLayouts: normalizeSectionRowLayouts(obj.sectionRowLayouts)
  };
}

export function resolveHeroMetricKeys(
  userHeroMetrics: MetricKey[],
  presetHeroMetrics: MetricKey[]
): MetricKey[] {
  if (userHeroMetrics.length > 0) return userHeroMetrics.slice(0, MAX_HERO_METRICS);
  const fromPreset = presetHeroMetrics.slice(0, MAX_HERO_METRICS);
  if (fromPreset.length >= MAX_HERO_METRICS) return fromPreset;
  const padded = [...fromPreset];
  for (const key of DEFAULT_DASHBOARD_HERO_METRICS) {
    if (padded.length >= MAX_HERO_METRICS) break;
    if (!padded.includes(key)) padded.push(key);
  }
  return padded.slice(0, MAX_HERO_METRICS);
}

export function resolveVisibleSectionOrder(layout: DashboardLayoutPrefs): DashboardSectionKey[] {
  return layout.sectionOrder.filter((key) => layout.sections[key]);
}

export { DEFAULT_DASHBOARD_CHART_METRICS };
