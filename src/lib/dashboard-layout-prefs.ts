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
  | "agencyHealth";

export type DashboardSections = Record<DashboardSectionKey, boolean>;

export type DashboardLayoutPrefs = {
  sections: DashboardSections;
  /** Empty = use campaign preset defaults. */
  heroMetrics: MetricKey[];
};

export const DASHBOARD_SECTION_KEYS: DashboardSectionKey[] = [
  "brainShelf",
  "heroKpis",
  "secondaryMetrics",
  "chart",
  "alerts",
  "agencyHealth"
];

export const DEFAULT_DASHBOARD_SECTIONS: DashboardSections = {
  brainShelf: true,
  heroKpis: true,
  secondaryMetrics: true,
  chart: true,
  alerts: true,
  agencyHealth: true
};

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayoutPrefs = {
  sections: { ...DEFAULT_DASHBOARD_SECTIONS },
  heroMetrics: []
};

export const MAX_HERO_METRICS = 3;

export function normalizeDashboardHeroMetrics(raw: unknown): MetricKey[] {
  if (!Array.isArray(raw)) return [];
  const valid = raw.filter(
    (k): k is MetricKey => typeof k === "string" && k in METRIC_BY_KEY
  );
  return [...new Set(valid)].slice(0, MAX_HERO_METRICS);
}

export function normalizeDashboardLayout(raw: unknown): DashboardLayoutPrefs {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_DASHBOARD_LAYOUT, sections: { ...DEFAULT_DASHBOARD_SECTIONS } };

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
    heroMetrics: normalizeDashboardHeroMetrics(obj.heroMetrics)
  };
}

export function resolveHeroMetricKeys(
  userHeroMetrics: MetricKey[],
  presetHeroMetrics: MetricKey[]
): MetricKey[] {
  if (userHeroMetrics.length > 0) return userHeroMetrics.slice(0, MAX_HERO_METRICS);
  return presetHeroMetrics.slice(0, MAX_HERO_METRICS);
}

export { DEFAULT_DASHBOARD_CHART_METRICS };
