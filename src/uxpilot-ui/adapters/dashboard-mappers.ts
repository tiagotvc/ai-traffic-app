import type { ClientHealthRow, HealthMetric } from "@/components/dashboard/AgencyHealthLayout";
import type { IntelligenceEvent } from "@/components/dashboard/LiveIntelligenceFeed";
import type { KpiCard, SecondaryMetric } from "@/components/dashboard/MetricPrism";
import type { ActionSuggestionDto } from "@/lib/action-suggestions/types";
import { presetMetricsFor } from "@/lib/campaign-presets";
import {
  METRIC_BY_KEY,
  QUICK_METRICS,
  formatMetricValue,
  type MetricKey
} from "@/lib/dashboard-metrics";
import { formatDayLabel, pctDelta } from "@/lib/dashboard-ranges";
import { formatBRL, formatPercent, formatRoas } from "@/lib/format";

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
  locale: string;
  metricLabel: (key: MetricKey) => string;
  vsLabel: string;
}): { primaryKPIs: KpiCard[]; secondaryMetrics: SecondaryMetric[] } {
  const { summary, prevSummary, series, dominantPreset, locale, metricLabel, vsLabel } = args;
  const heroKeys = presetMetricsFor(dominantPreset).slice(0, 3);

  const primaryKPIs: KpiCard[] = heroKeys.map((key) => {
    const delta = heroDelta(key, summary, prevSummary);
    const { change, trend } = deltaMeta(key, delta);
    return {
      label: metricLabel(key),
      value: formatMetricValue(key, summary[key] ?? 0, locale),
      change,
      trend,
      color: METRIC_BY_KEY[key].color,
      sparkData: series.map((p) => p[key] ?? 0),
      subLabel: vsLabel
    };
  });

  const secondaryKeys = QUICK_METRICS.filter((k) => !heroKeys.includes(k)).slice(0, 5);
  const secondaryMetrics: SecondaryMetric[] = secondaryKeys.map((key) => {
    const delta = heroDelta(key, summary, prevSummary);
    const { change, trend } = deltaMeta(key, delta);
    return {
      label: metricLabel(key),
      value: formatMetricValue(key, summary[key] ?? 0, locale),
      change,
      trend
    };
  });

  return { primaryKPIs, secondaryMetrics };
}

export function toChartData(series: SeriesPoint[], locale: string) {
  return series.map((p) => ({ ...p, label: formatDayLabel(p.day, locale) }));
}

export function toIntelligenceEvents(args: {
  variations: VariationLite[];
  criticalAlerts: AlertItem[];
  metricLabel: (key: MetricKey) => string;
  vsLabel: string;
}): IntelligenceEvent[] {
  const { variations, criticalAlerts, metricLabel, vsLabel } = args;
  const fromAlerts: IntelligenceEvent[] = criticalAlerts.slice(0, 3).map((a) => ({
    id: `alert-${a.id}`,
    type: "critical" as const,
    title: a.title,
    detail: a.description,
    time: "agora",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    pulse: true,
    href: "/alerts"
  }));

  const fromVariations: IntelligenceEvent[] = variations.slice(0, 6).map((v) => {
    const type =
      v.severity === "positive" ? ("win" as const) : v.severity === "critical" ? ("critical" as const) : ("info" as const);
    const color =
      type === "win" ? "#10b981" : type === "critical" ? "#ef4444" : "#f5a623";
    return {
      id: v.id,
      type,
      title: v.entityName ?? metricLabel(v.metric),
      detail: `${metricLabel(v.metric)} · ${vsLabel}`,
      time: `${v.direction === "up" ? "▲" : "▼"} ${Math.abs(v.deltaPct).toFixed(0)}%`,
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
}): { healthMetrics: HealthMetric[]; clients: ClientHealthRow[] } {
  const { clients, locale } = args;
  const active = clients.length;
  const healthy = clients.filter((c) => (c.roas ?? 0) >= 1.5 && (c.alertCount ?? 0) === 0).length;
  const alerts = clients.reduce((sum, c) => sum + (c.alertCount ?? 0), 0);
  const totalSpend = clients.reduce((sum, c) => sum + (c.metrics?.spend ?? 0), 0);

  const healthMetrics: HealthMetric[] = [
    { label: "Clientes ativos", value: String(active), change: "—", color: "#10b981" },
    { label: "Saudáveis", value: String(healthy), change: "—", color: "#f5a623" },
    { label: "Alertas", value: String(alerts), change: "—", color: alerts > 0 ? "#ef4444" : "#10b981" },
    {
      label: "Spend total",
      value: formatBRL(totalSpend, locale),
      change: "—",
      color: "#7c3aed"
    }
  ];

  const rows: ClientHealthRow[] = clients.slice(0, 8).map((c) => {
    const spend = c.metrics?.spend ?? 0;
    const roas = c.roas ?? c.metrics?.roas ?? 0;
    const cpa = c.metrics?.cpa ?? 0;
    const status: "healthy" | "warning" =
      (c.alertCount ?? 0) > 0 || roas < 1 ? "warning" : "healthy";
    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      spend: formatBRL(spend, locale),
      roas: formatRoas(roas, locale),
      cpl: cpa > 0 ? formatBRL(cpa, locale) : "—",
      trend: roas >= 1.5 ? `▲ ${formatPercent(Math.min(roas * 10, 99), 0, locale)}` : "—",
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

export function toBrainShelfSuggestions(
  items: ActionSuggestionDto[]
): BrainShelfSuggestion[] {
  return items.slice(0, 3).map((dto) => {
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
      action: "Ver sugestão",
      actionHref: "/agency-brain/suggestions",
      confidence: Math.min(99, Math.max(40, dto.evidence?.priorityScore ?? 72)),
      color,
      border: `${color}33`
    };
  });
}
