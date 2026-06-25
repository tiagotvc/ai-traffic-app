import type { ClientHealthRow, HealthMetric } from "@/components/dashboard/AgencyHealthLayout";
import type { IntelligenceEvent } from "@/components/dashboard/LiveIntelligenceFeed";
import type { KpiCard, SecondaryMetric } from "@/components/dashboard/MetricPrism";
import type { ActionSuggestionDto } from "@/lib/action-suggestions/types";
import type { LearningDto } from "@/lib/agency-brain/types";
import { presetMetricsFor } from "@/lib/campaign-presets";
import {
  METRIC_BY_KEY,
  QUICK_METRICS,
  formatMetricValue,
  type MetricKey
} from "@/lib/dashboard-metrics";
import { resolveHeroMetricKeys } from "@/lib/dashboard-layout-prefs";
import { formatDayLabel, pctDelta } from "@/lib/dashboard-ranges";
import { formatBRL, formatRoas } from "@/lib/format";

type Summary = Partial<Record<MetricKey, number>>;

type SeriesPoint = { day: string } & Partial<Record<MetricKey, number>>;

type VariationLite = {
  id: string;
  metric: MetricKey;
  deltaPct: number;
  direction: "up" | "down";
  severity: "critical" | "warning" | "positive";
  entityName: string | null;
};

type AlertItem = {
  id: string;
  title: string;
  description: string;
};

type ClientCard = {
  id: string;
  slug: string;
  name: string;
  roas: number;
  metrics?: Partial<Record<MetricKey, number>>;
  alertCount?: number;
};

const COST_METRICS = new Set<MetricKey>(["spend", "cpc", "cpm", "cpa", "cpmsg"]);

function deltaMeta(
  key: MetricKey,
  delta: number | null
): { change: string; trend: "up" | "down" | "neutral" } {
  if (delta === null) return { change: "—", trend: "neutral" };
  const sign = delta >= 0 ? "+" : "";
  const rawTrend = delta > 0 ? "up" : delta < 0 ? "down" : "neutral";
  if (COST_METRICS.has(key) && rawTrend !== "neutral") {
    return {
      change: `${sign}${Math.abs(delta).toFixed(1)}%`,
      trend: rawTrend === "up" ? "down" : "up"
    };
  }
  return { change: `${sign}${delta.toFixed(1)}%`, trend: rawTrend };
}

function heroDelta(key: MetricKey, summary: Summary, prevSummary: Summary | null): number | null {
  const prev = prevSummary?.[key];
  if (prev == null || prev <= 0) return null;
  return pctDelta(summary[key] ?? 0, prev);
}

export function toMetricPrismProps(args: {
  summary: Summary;
  prevSummary: Summary | null;
  series: SeriesPoint[];
  dominantPreset?: string;
  heroMetrics?: MetricKey[];
  locale: string;
  metricLabel: (key: MetricKey) => string;
  vsLabel: string;
}): { primaryKPIs: KpiCard[]; secondaryMetrics: SecondaryMetric[] } {
  const { summary, prevSummary, series, dominantPreset, heroMetrics, locale, metricLabel, vsLabel } = args;
  const presetHero = presetMetricsFor(dominantPreset).slice(0, 3);
  const heroKeys = resolveHeroMetricKeys(heroMetrics ?? [], presetHero);

  const primaryKPIs: KpiCard[] = heroKeys.map((key) => {
    const delta = heroDelta(key, summary, prevSummary);
    const { change, trend } = deltaMeta(key, delta);
    return {
      metricKey: key,
      label: metricLabel(key),
      value: formatMetricValue(key, summary[key] ?? 0, locale),
      change,
      trend,
      color: METRIC_BY_KEY[key].color,
      sparkData: series.map((p) => p[key] ?? 0),
      sparkLabels: series.map((p) => formatDayLabel(p.day, locale)),
      formatSparkValue: (v: number) => formatMetricValue(key, v, locale),
      subLabel: vsLabel
    };
  });

  const secondaryKeys = presetMetricsFor(dominantPreset)
    .concat(QUICK_METRICS)
    .filter((k, i, arr) => !heroKeys.includes(k) && arr.indexOf(k) === i)
    .slice(0, 6);
  const secondaryMetrics: SecondaryMetric[] = secondaryKeys.map((key) => {
    const delta = heroDelta(key, summary, prevSummary);
    const { change, trend } = deltaMeta(key, delta);
    return {
      key,
      label: metricLabel(key),
      value: formatMetricValue(key, summary[key] ?? 0, locale),
      change,
      trend
    };
  });

  return { primaryKPIs, secondaryMetrics };
}

export function toChartData(series: SeriesPoint[], locale: string) {
  return [...series]
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((p) => ({ ...p, label: formatDayLabel(p.day, locale) }));
}

const severityOrder: Record<VariationLite["severity"], number> = {
  critical: 0,
  warning: 1,
  positive: 2
};

export function toIntelligenceEvents(args: {
  variations: VariationLite[];
  criticalAlerts: AlertItem[];
  metricLabel: (key: MetricKey) => string;
  vsLabel: string;
  nowLabel?: string;
  recentLabel?: string;
}): IntelligenceEvent[] {
  const {
    variations,
    criticalAlerts,
    metricLabel,
    vsLabel,
    nowLabel = "agora",
    recentLabel = "recente"
  } = args;

  const fromAlerts: IntelligenceEvent[] = criticalAlerts.slice(0, 4).map((a) => ({
    id: `alert-${a.id}`,
    type: "critical" as const,
    title: a.title,
    detail: a.description,
    time: nowLabel,
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    pulse: true,
    href: "/alerts"
  }));

  const sortedVariations = [...variations].sort((a, b) => {
    const bySeverity = severityOrder[a.severity] - severityOrder[b.severity];
    if (bySeverity !== 0) return bySeverity;
    return Math.abs(b.deltaPct) - Math.abs(a.deltaPct);
  });

  const fromVariations: IntelligenceEvent[] = sortedVariations.slice(0, 6).map((v) => {
    const type =
      v.severity === "positive" ? ("win" as const) : v.severity === "critical" ? ("critical" as const) : ("info" as const);
    const color =
      type === "win" ? "#10b981" : type === "critical" ? "#ef4444" : "#f5a623";
    const sign = v.deltaPct >= 0 ? "+" : "";
    return {
      id: v.id,
      type,
      title: v.entityName ?? metricLabel(v.metric),
      detail: `${metricLabel(v.metric)} ${sign}${v.deltaPct.toFixed(1)}% · ${vsLabel}`,
      time: recentLabel,
      color,
      bg: `${color}14`,
      pulse: type === "critical",
      href: "/alerts"
    };
  });

  return [...fromAlerts, ...fromVariations].slice(0, 8);
}

export function toAgencyHealth(args: {
  clients: ClientCard[];
  locale: string;
  summary?: Summary | null;
  prevSummary?: Summary | null;
  clientMetric?: MetricKey;
  formatMetric?: (key: MetricKey, value: number) => string;
  labels: {
    activeClients: string;
    healthy: string;
    alerts: string;
    totalSpend: string;
  };
}): { healthMetrics: HealthMetric[]; clients: ClientHealthRow[] } {
  const { clients, locale, summary, prevSummary, clientMetric = "roas", formatMetric, labels } = args;
  const active = clients.length;
  const healthy = clients.filter((c) => (c.roas ?? 0) >= 1.5 && (c.alertCount ?? 0) === 0).length;
  const alerts = clients.reduce((sum, c) => sum + (c.alertCount ?? 0), 0);
  const totalSpend = summary?.spend ?? clients.reduce((sum, c) => sum + (c.metrics?.spend ?? 0), 0);
  const spendDelta = heroDelta("spend", { spend: totalSpend }, prevSummary ? { spend: prevSummary.spend ?? 0 } : null);
  const spendChange = deltaMeta("spend", spendDelta);

  const healthMetrics: HealthMetric[] = [
    { label: labels.activeClients, value: String(active), change: "—", color: "#10b981" },
    { label: labels.healthy, value: String(healthy), change: "—", color: "#f5a623" },
    { label: labels.alerts, value: String(alerts), change: "—", color: alerts > 0 ? "#ef4444" : "#10b981" },
    {
      label: labels.totalSpend,
      value: formatBRL(totalSpend, locale),
      change: spendChange.change,
      color: "#7c3aed"
    }
  ];

  const rows: ClientHealthRow[] = clients.slice(0, 8).map((c) => {
    const spend = c.metrics?.spend ?? 0;
    const roas = c.roas ?? c.metrics?.roas ?? 0;
    const cpa = c.metrics?.cpa ?? 0;
    const focusRaw = c.metrics?.[clientMetric] ?? (clientMetric === "roas" ? roas : 0);
    const status: "healthy" | "warning" =
      (c.alertCount ?? 0) > 0 || roas < 1 ? "warning" : "healthy";
    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      spend: formatBRL(spend, locale),
      roas: formatRoas(roas, locale),
      cpl: cpa > 0 ? formatBRL(cpa, locale) : "—",
      trend: formatMetric ? formatMetric(clientMetric, focusRaw) : formatRoas(roas, locale),
      status
    };
  });

  return { healthMetrics, clients: rows };
}

type BrainShelfSuggestion = {
  id: string;
  type: "opportunity" | "alert" | "suggestion";
  title: string;
  body: string;
  action: string;
  actionHref?: string;
  confidence: number;
  color: string;
  border: string;
};

export function toBrainShelfLearnings(
  items: Array<LearningDto & { clientName?: string; clientSlug?: string }>
): BrainShelfSuggestion[] {
  return items.slice(0, 4).map((dto) => {
    const isHighImpact = dto.impact === "HIGH";
    const isSuggested = dto.status === "SUGGESTED";
    const type: BrainShelfSuggestion["type"] = isSuggested
      ? "alert"
      : isHighImpact
        ? "opportunity"
        : "suggestion";
    const color = type === "alert" ? "#f5a623" : type === "opportunity" ? "#10b981" : "#7c3aed";
    const confidence =
      dto.confidenceScore ??
      (dto.confidence === "HIGH" ? 85 : dto.confidence === "MEDIUM" ? 65 : 45);
    const detailPrefix = dto.clientName ? `${dto.clientName} · ` : "";
    const body = `${detailPrefix}${dto.description}`;
    return {
      id: dto.id,
      type,
      title: dto.title,
      body: body.length > 140 ? `${body.slice(0, 137)}…` : body,
      action: "",
      actionHref: `/agency-brain/learnings/${dto.id}`,
      confidence: Math.min(99, Math.max(40, confidence)),
      color,
      border: `${color}33`
    };
  });
}

/** @deprecated use toBrainShelfLearnings */
export function toBrainShelfSuggestions(
  items: ActionSuggestionDto[]
): BrainShelfSuggestion[] {
  return items.slice(0, 4).map((dto) => {
    const isAlert = dto.priority === "HIGH";
    const isOpportunity =
      dto.actionType === "scale_budget" || dto.actionType === "duplicate_audience";
    const type = isAlert ? "alert" : isOpportunity ? "opportunity" : "suggestion";
    const color = type === "alert" ? "#ef4444" : type === "opportunity" ? "#10b981" : "#f5a623";
    return {
      id: dto.id,
      type,
      title: dto.title,
      body: dto.description,
      action: "",
      actionHref: "/agency-brain/suggestions",
      confidence: Math.min(99, Math.max(40, dto.evidence?.priorityScore ?? 72)),
      color,
      border: `${color}33`
    };
  });
}
