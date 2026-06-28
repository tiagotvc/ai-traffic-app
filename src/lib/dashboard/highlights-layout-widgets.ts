import { presetMetricsFor } from "@/lib/campaign-presets";
import {
  DEFAULT_PERIOD_METRICS,
  MAX_HERO_METRICS,
  MAX_PERIOD_METRICS,
  resolveHeroMetricKeys,
  type DashboardLayoutPrefs
} from "@/lib/dashboard-layout-prefs";
import { QUICK_METRICS, type MetricKey } from "@/lib/dashboard-metrics";
import { normalizeWidgetLayout } from "@/lib/dashboard/widget-layout-normalize";
import { HIGHLIGHTS_EDIT_SCALE } from "@/lib/dashboard/widget-grid-fit";
import type { WidgetInstanceDto, WidgetSize } from "@/lib/dashboard/widget-catalog";

export const HIGHLIGHTS_HERO_GROUP = "heroKpi";
export const HIGHLIGHTS_SECONDARY_GROUP = "secondaryKpi";

/** Grid rows a hero KPI card occupies — tall enough for icon + value + sparkline. */
export const HERO_CARD_ROWS = 4;

const FALLBACK_HERO: MetricKey[] = [
  "spend",
  "ctr",
  "reach",
  "conversions",
  "clicks",
  "cpc",
  "roas",
  "cpm"
];
const SECONDARY_COLS = 3;
/** Max compact KPI pills in one horizontal row (6 × w=2 = 12 cols). */
const SECONDARY_ROW_CAPACITY = 6;

function secondarySlot(index: number, baseY: number) {
  return {
    x: (index % SECONDARY_ROW_CAPACITY) * SECONDARY_CARD_W,
    y: baseY + Math.floor(index / SECONDARY_ROW_CAPACITY)
  };
}

export function secondaryRowCount(count: number) {
  if (count <= 0) return 0;
  return Math.ceil(count / SECONDARY_ROW_CAPACITY);
}
/** Compact secondary KPI pills — 2 columns × 1 row (3 per row at x=0,2,4). */
export const SECONDARY_CARD_W = 2;
const LEGACY_SECONDARY_CARD_W = 4;
const LEGACY_SECONDARY_CARD_W_NARROW = 1;

export function resolveHighlightsHeroKeys(heroMetrics?: MetricKey[]): MetricKey[] {
  const fallback = presetMetricsFor(undefined).slice(0, MAX_HERO_METRICS) as MetricKey[];
  const resolved = resolveHeroMetricKeys(heroMetrics ?? [], fallback);
  return resolved.length ? resolved : FALLBACK_HERO;
}

export function resolveSecondaryMetricKeys(_heroMetrics?: MetricKey[], _dominantPreset?: string): MetricKey[] {
  return DEFAULT_PERIOD_METRICS.slice(0, MAX_PERIOD_METRICS);
}

function heroCardWidth(count: number): number {
  const n = Math.min(Math.max(count, 1), MAX_HERO_METRICS);
  return Math.floor(12 / n);
}

/** One metrics.heroKpis block → up to 3 independent metrics.card widgets. */
export function splitHeroKpisWidget(
  widget: WidgetInstanceDto,
  heroMetrics?: MetricKey[]
): WidgetInstanceDto[] {
  const keys = resolveHighlightsHeroKeys(
    Array.isArray(widget.config.heroMetrics)
      ? (widget.config.heroMetrics as MetricKey[])
      : heroMetrics
  );
  const cardW = heroCardWidth(keys.length);

  return keys.map((metricKey, index) => ({
    id: `${widget.id}-hero-${metricKey}-${index}`,
    layoutId: widget.layoutId,
    widgetType: "metrics.card",
    title: null,
    x: index * cardW,
    y: widget.y,
    w: cardW,
    h: Math.max(widget.h, HERO_CARD_ROWS),
    size: "xs" as WidgetSize,
    visible: widget.visible,
    config: {
      metricKey,
      cardStyle: "centered",
      highlightsGroup: HIGHLIGHTS_HERO_GROUP
    },
    sortOrder: widget.sortOrder + index
  }));
}

export function expandHeroKpisInLayout(
  widgets: WidgetInstanceDto[],
  heroMetrics?: MetricKey[]
): WidgetInstanceDto[] {
  const expanded: WidgetInstanceDto[] = [];
  for (const w of widgets) {
    if (w.widgetType === "metrics.heroKpis") {
      expanded.push(...splitHeroKpisWidget(w, heroMetrics));
    } else {
      expanded.push(w);
    }
  }
  return expanded;
}

export function splitQuickPillsWidget(
  widget: WidgetInstanceDto,
  heroMetrics?: MetricKey[]
): WidgetInstanceDto[] {
  const keys = resolveSecondaryMetricKeys(heroMetrics);

  return keys.map((metricKey, index) => {
    const slot = secondarySlot(index, widget.y);
    return {
      id: `${widget.id}-sec-${metricKey}-${index}`,
      layoutId: widget.layoutId,
      widgetType: "metrics.card",
      title: null,
      x: slot.x,
      y: slot.y,
      w: SECONDARY_CARD_W,
      h: 1,
      size: "xs" as WidgetSize,
      visible: widget.visible,
      config: {
        metricKey,
        cardStyle: "compact",
        highlightsGroup: HIGHLIGHTS_SECONDARY_GROUP
      },
      sortOrder: widget.sortOrder + index
    };
  });
}

export function expandQuickPillsInLayout(
  widgets: WidgetInstanceDto[],
  heroMetrics?: MetricKey[]
): WidgetInstanceDto[] {
  const expanded: WidgetInstanceDto[] = [];
  for (const w of widgets) {
    if (w.widgetType === "metrics.quickPills") {
      expanded.push(...splitQuickPillsWidget(w, heroMetrics));
    } else {
      expanded.push(w);
    }
  }
  return expanded;
}

function expandLegacyHighlightsWidgets(
  widgets: WidgetInstanceDto[],
  heroMetrics?: MetricKey[]
): WidgetInstanceDto[] {
  return expandQuickPillsInLayout(expandHeroKpisInLayout(widgets, heroMetrics), heroMetrics);
}

function bumpChartAndAgeHeights(widgets: WidgetInstanceDto[]): WidgetInstanceDto[] {
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

function normalizeBrainShelfGrid(widgets: WidgetInstanceDto[]): WidgetInstanceDto[] {
  let changed = false;
  const mapped = widgets.map((w) => {
    if (w.widgetType !== "brain.learnings") return w;
    if (w.h === 1) return w;
    changed = true;
    return { ...w, h: 1 };
  });
  return changed ? mapped : widgets;
}

/** Migrate legacy secondary KPIs → canonical 2×1 cells. */
function normalizeSecondaryKpiGrid(widgets: WidgetInstanceDto[]): WidgetInstanceDto[] {
  let changed = false;
  const mapped = widgets.map((w) => {
    if (w.config.highlightsGroup !== HIGHLIGHTS_SECONDARY_GROUP) return w;

    let x = w.x;
    let width = w.w;
    const height = 1;

    if (w.w >= LEGACY_SECONDARY_CARD_W && w.h > 1) {
      const col = Math.min(
        SECONDARY_COLS - 1,
        Math.max(0, Math.round(w.x / LEGACY_SECONDARY_CARD_W))
      );
      x = col * SECONDARY_CARD_W;
      width = SECONDARY_CARD_W;
    } else if (w.w === LEGACY_SECONDARY_CARD_W_NARROW) {
      x = w.x * SECONDARY_CARD_W;
      width = SECONDARY_CARD_W;
    } else if (w.w !== SECONDARY_CARD_W) {
      width = SECONDARY_CARD_W;
    }

    if (x !== w.x || width !== w.w || height !== w.h) {
      changed = true;
      return { ...w, x, w: width, h: height };
    }
    return w;
  });
  return changed ? mapped : widgets;
}

function isVisibleWidget(w: WidgetInstanceDto): boolean {
  return w.visible !== false;
}

function orderedHeroWidgets(
  heroes: WidgetInstanceDto[],
  heroMetrics?: MetricKey[]
): WidgetInstanceDto[] {
  const keys = resolveHighlightsHeroKeys(heroMetrics);
  const byKey = new Map<string, WidgetInstanceDto>();
  for (const w of heroes) {
    const key = w.config.metricKey as string | undefined;
    if (key) byKey.set(key, w);
  }
  const ordered: WidgetInstanceDto[] = [];
  for (const key of keys) {
    const match = byKey.get(key);
    if (match) ordered.push(match);
  }
  for (const w of heroes) {
    if (!ordered.includes(w)) ordered.push(w);
  }
  return ordered.slice(0, MAX_HERO_METRICS);
}

function orderedSecondaryWidgets(
  secondary: WidgetInstanceDto[],
  heroMetrics?: MetricKey[]
): WidgetInstanceDto[] {
  const keys = resolveSecondaryMetricKeys(heroMetrics);
  const byKey = new Map<string, WidgetInstanceDto>();
  for (const w of secondary) {
    const key = w.config.metricKey as string | undefined;
    if (key) byKey.set(key, w);
  }
  const ordered: WidgetInstanceDto[] = [];
  for (const key of keys) {
    const match = byKey.get(key);
    if (match) ordered.push(match);
  }
  for (const w of secondary) {
    if (!ordered.includes(w)) ordered.push(w);
  }
  return ordered.slice(0, 6);
}

/** Stack Destaques blocks in the canonical order (matches default seed layout). */
export function reflowHighlightsCanonicalLayout(
  widgets: WidgetInstanceDto[],
  heroMetrics?: MetricKey[]
): WidgetInstanceDto[] {
  const brain = widgets.filter((w) => w.widgetType === "brain.learnings" && isVisibleWidget(w));
  const heroes = orderedHeroWidgets(
    widgets.filter((w) => isHeroKpiWidget(w) && isVisibleWidget(w)),
    heroMetrics
  );
  const secondary = orderedSecondaryWidgets(
    widgets.filter((w) => isSecondaryKpiWidget(w) && isVisibleWidget(w)),
    heroMetrics
  );
  const chart = widgets.find((w) => w.widgetType === "chart.performance" && isVisibleWidget(w));
  const alerts = widgets.find((w) => w.widgetType === "alerts.feed" && isVisibleWidget(w));
  const age = widgets.find((w) => w.widgetType === "analytics.ageBreakdown" && isVisibleWidget(w));
  const agencyHealth = widgets.find((w) => w.widgetType === "clients.health" && isVisibleWidget(w));

  const placedIds = new Set<string>();
  for (const w of [brain, heroes, secondary, chart, alerts, age, agencyHealth].flat()) {
    if (w) placedIds.add(w.id);
  }
  const others = widgets
    .filter((w) => isVisibleWidget(w) && !placedIds.has(w.id))
    .sort((a, b) => a.y - b.y || a.x - b.x || a.sortOrder - b.sortOrder);
  const hidden = widgets.filter((w) => !isVisibleWidget(w));

  const out: WidgetInstanceDto[] = [];
  let y = 0;

  for (const w of brain) {
    out.push({ ...w, x: 0, y, w: 12, h: 1 });
  }
  if (brain.length) y += 1;

  if (heroes.length) {
    const cardW = heroCardWidth(resolveHighlightsHeroKeys(heroMetrics).length);
    heroes.forEach((w, index) => {
      out.push({
        ...w,
        x: index * cardW,
        y,
        w: cardW,
        h: HERO_CARD_ROWS,
        widgetType: "metrics.card",
        config: {
          ...w.config,
          cardStyle: "centered",
          highlightsGroup: HIGHLIGHTS_HERO_GROUP
        }
      });
    });
    y += HERO_CARD_ROWS;
  }

  if (secondary.length) {
    const rowY = y;
    secondary.forEach((w, index) => {
      const slot = secondarySlot(index, rowY);
      out.push({
        ...w,
        x: slot.x,
        y: slot.y,
        w: SECONDARY_CARD_W,
        h: 1,
        widgetType: "metrics.card",
        config: {
          ...w.config,
          cardStyle: "compact",
          highlightsGroup: HIGHLIGHTS_SECONDARY_GROUP
        }
      });
    });
    y += secondaryRowCount(secondary.length);
  }

  const chartY = y;
  const chartH = chart ? Math.max(chart.h, 8) : 0;
  const alertsH = alerts ? Math.max(alerts.h, 5) : 0;

  if (chart && alerts) {
    out.push({ ...chart, x: 0, y: chartY, w: 8, h: chartH });
    out.push({ ...alerts, x: 8, y: chartY, w: 4, h: alertsH });
    y = chartY + Math.max(chartH, alertsH);
  } else if (chart) {
    out.push({ ...chart, x: 0, y: chartY, w: 12, h: chartH });
    y = chartY + chartH;
  } else if (alerts) {
    out.push({ ...alerts, x: 0, y: chartY, w: 12, h: alertsH });
    y = chartY + alertsH;
  }

  if (age) {
    const ageH = Math.max(age.h, 5);
    out.push({ ...age, x: 0, y, w: 12, h: ageH });
    y += ageH;
  }

  if (agencyHealth) {
    out.push({ ...agencyHealth, x: 0, y, w: 12, h: agencyHealth.h });
    y += agencyHealth.h;
  }

  for (const w of others) {
    out.push({ ...w, x: w.x, y, w: w.w, h: w.h });
    y += w.h;
  }

  out.push(...hidden);
  return out;
}

/** Split legacy hero/quick-pill rows + resolve overlaps for Destaques default layout. */
export function prepareHighlightsLayoutWidgets(
  widgets: WidgetInstanceDto[],
  heroMetrics?: MetricKey[]
): WidgetInstanceDto[] {
  const expanded = expandLegacyHighlightsWidgets(widgets, heroMetrics);
  const brain = normalizeBrainShelfGrid(expanded);
  const secondary = normalizeSecondaryKpiGrid(brain);
  const sized = bumpChartAndAgeHeights(secondary);
  const reflowed = reflowHighlightsCanonicalLayout(sized, heroMetrics);
  return normalizeWidgetLayout(reflowed);
}

export function highlightsLayoutNeedsPrepare(
  widgets: WidgetInstanceDto[],
  heroMetrics?: MetricKey[]
): boolean {
  if (widgets.some((w) => w.widgetType === "metrics.heroKpis" || w.widgetType === "metrics.quickPills")) {
    return true;
  }
  if (widgets.some((w) => w.widgetType === "brain.learnings" && w.h !== 1)) {
    return true;
  }
  if (
    widgets.some(
      (w) =>
        w.config.highlightsGroup === HIGHLIGHTS_SECONDARY_GROUP && w.h !== 1
    )
  ) {
    return true;
  }
  const prepared = prepareHighlightsLayoutWidgets(widgets, heroMetrics);
  if (prepared.length !== widgets.length) return true;
  return prepared.some((w) => {
    const orig = widgets.find((o) => o.id === w.id);
    if (!orig) return true;
    return orig.h !== w.h || orig.y !== w.y || orig.x !== w.x || orig.w !== w.w;
  });
}

export function heroKpiCardsDraft(
  y: number,
  heroMetrics: MetricKey[],
  sortOrderStart: number
): Omit<WidgetInstanceDto, "id" | "layoutId">[] {
  const keys = resolveHighlightsHeroKeys(heroMetrics);
  const cardW = heroCardWidth(keys.length);

  return keys.map((metricKey, index) => ({
    widgetType: "metrics.card",
    title: null,
    x: index * cardW,
    y,
    w: cardW,
    h: HERO_CARD_ROWS,
    size: "xs" as WidgetSize,
    visible: true,
    config: {
      metricKey,
      cardStyle: "centered",
      highlightsGroup: HIGHLIGHTS_HERO_GROUP
    },
    sortOrder: sortOrderStart + index
  }));
}

export function secondaryKpiCardsDraft(
  y: number,
  heroMetrics: MetricKey[],
  sortOrderStart: number
): Omit<WidgetInstanceDto, "id" | "layoutId">[] {
  const keys = resolveSecondaryMetricKeys(heroMetrics);

  return keys.map((metricKey, index) => {
    const slot = secondarySlot(index, y);
    return {
      widgetType: "metrics.card",
      title: null,
      x: slot.x,
      y: slot.y,
      w: SECONDARY_CARD_W,
      h: 1,
      size: "xs" as WidgetSize,
      visible: true,
      config: {
        metricKey,
        cardStyle: "compact",
        highlightsGroup: HIGHLIGHTS_SECONDARY_GROUP
      },
      sortOrder: sortOrderStart + index
    };
  });
}

export function isSecondaryKpiWidget(w: WidgetInstanceDto): boolean {
  return (
    w.widgetType === "metrics.quickPills" ||
    (w.widgetType === "metrics.card" && w.config.highlightsGroup === HIGHLIGHTS_SECONDARY_GROUP)
  );
}

export function syncSecondaryMetricsOnWidgets(
  widgets: WidgetInstanceDto[],
  prefs: DashboardLayoutPrefs
): WidgetInstanceDto[] {
  return widgets.map((w) => {
    if (!isSecondaryKpiWidget(w)) return w;
    return {
      ...w,
      visible: prefs.sections.secondaryMetrics,
      widgetType: "metrics.card",
      config: {
        ...w.config,
        cardStyle: "compact",
        highlightsGroup: HIGHLIGHTS_SECONDARY_GROUP
      }
    };
  });
}

export function isHeroKpiWidget(w: WidgetInstanceDto): boolean {
  return (
    w.widgetType === "metrics.heroKpis" ||
    (w.widgetType === "metrics.card" && w.config.highlightsGroup === HIGHLIGHTS_HERO_GROUP)
  );
}

/** Hero KPI cards shrink-wrap in Destaques view; compact pills and brain banner use fixed rows. */
export function isHighlightFitWidget(w: WidgetInstanceDto): boolean {
  if (w.widgetType === "brain.learnings") return false;
  if (w.widgetType !== "metrics.card") return false;
  return w.config.highlightsGroup === HIGHLIGHTS_HERO_GROUP;
}

/** Scale x/w for square edit grid (12 → 24 columns). */
export function scaleHighlightsLayoutForSquareEdit(
  widgets: WidgetInstanceDto[]
): WidgetInstanceDto[] {
  const factor = HIGHLIGHTS_EDIT_SCALE;
  return widgets.map((w) => ({
    ...w,
    x: w.x * factor,
    w: w.w * factor
  }));
}

/** Scale x/w back to stored 12-column convention. */
export function scaleHighlightsLayoutFromSquareEdit(
  widgets: WidgetInstanceDto[]
): WidgetInstanceDto[] {
  const factor = HIGHLIGHTS_EDIT_SCALE;
  return normalizeWidgetLayout(
    widgets.map((w) => ({
      ...w,
      x: Math.max(0, Math.round(w.x / factor)),
      w: Math.max(1, Math.round(w.w / factor))
    }))
  );
}

/** Finalize Destaques organize session before persisting. */
export function finalizeHighlightsLayoutWidgets(
  widgets: WidgetInstanceDto[],
  heroMetrics?: MetricKey[]
): WidgetInstanceDto[] {
  const heroCardW = heroCardWidth(resolveHighlightsHeroKeys(heroMetrics).length);
  const normalized = normalizeWidgetLayout(widgets);

  const withCanonicalHeights = normalized.map((w) => {
    if (w.config.highlightsGroup === HIGHLIGHTS_SECONDARY_GROUP) {
      return { ...w, h: 1 };
    }
    if (w.widgetType === "brain.learnings") {
      return { ...w, h: 1 };
    }
    if (w.config.highlightsGroup === HIGHLIGHTS_HERO_GROUP) {
      return { ...w, w: heroCardW };
    }
    return w;
  });

  return prepareHighlightsLayoutWidgets(withCanonicalHeights, heroMetrics);
}

export function syncHeroMetricsOnWidgets(
  widgets: WidgetInstanceDto[],
  prefs: DashboardLayoutPrefs
): WidgetInstanceDto[] {
  const keys = resolveHighlightsHeroKeys(prefs.heroMetrics);
  const cardW = heroCardWidth(keys.length);
  let heroIndex = 0;

  return widgets.map((w) => {
    if (!isHeroKpiWidget(w)) return w;
    const metricKey = keys[heroIndex] ?? keys[keys.length - 1]!;
    const index = heroIndex;
    heroIndex += 1;
    return {
      ...w,
      visible: prefs.sections.heroKpis,
      x: index * cardW,
      w: cardW,
      widgetType: "metrics.card",
      config: {
        ...w.config,
        metricKey,
        cardStyle: "centered",
        highlightsGroup: HIGHLIGHTS_HERO_GROUP
      }
    };
  });
}
