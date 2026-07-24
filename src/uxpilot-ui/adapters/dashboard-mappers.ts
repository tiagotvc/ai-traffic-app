import type { ClientHealthRow, HealthMetric } from "@/components/dashboard/AgencyHealthLayout";
import type { IntelligenceEvent } from "@/components/dashboard/LiveIntelligenceFeed";
import type { KpiCard, SecondaryMetric } from "@/components/dashboard/MetricPrism";
import type { ActionSuggestionDto } from "@/lib/action-suggestions/types";
import type { LearningDto } from "@/lib/agency-brain/types";
import { presetMetricsFor } from "@/lib/campaign-presets";
import {
  METRIC_BY_KEY,
  formatMetricValue,
  type MetricKey
} from "@/lib/dashboard-metrics";
import {
  MAX_HERO_METRICS,
  MAX_PERIOD_METRICS,
  resolveHeroMetricKeys,
  resolvePeriodMetricKeys
} from "@/lib/dashboard-layout-prefs";
import {
  formatDayLabel,
  formatDeltaChangeLabel,
  prevPeriodHasBaseline,
  resolveMetricDelta,
  type MetricDeltaResult
} from "@/lib/dashboard-ranges";
import {
  compareByRank,
  DEFAULT_RANK_CONFIG,
  meetsMinActivity,
  rankSpecFor,
  rankValue,
  type RankConfig
} from "@/lib/creative-ranking";
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
  result: MetricDeltaResult,
  newDeltaLabel: string
): { change: string; trend: "up" | "down" | "neutral" } {
  if (result.kind === "none") return { change: "—", trend: "neutral" };
  if (result.kind === "new") return { change: newDeltaLabel, trend: "up" };

  const delta = result.value;
  const change = formatDeltaChangeLabel(delta);
  const rawTrend = delta > 0 ? "up" : delta < 0 ? "down" : "neutral";
  if (COST_METRICS.has(key) && rawTrend !== "neutral") {
    return {
      change,
      trend: rawTrend === "up" ? "down" : "up"
    };
  }
  return { change, trend: rawTrend };
}

function heroDelta(key: MetricKey, summary: Summary, prevSummary: Summary | null): MetricDeltaResult {
  if (!prevSummary) return { kind: "none" };

  const cur = Number(summary[key] ?? 0);
  const prev = Number(prevSummary[key] ?? 0);
  const allowNew = !prevPeriodHasBaseline(prevSummary);

  return resolveMetricDelta(cur, prev, { allowNew });
}

function buildKpiCard(
  key: MetricKey,
  summary: Summary,
  prevSummary: Summary | null,
  series: SeriesPoint[],
  args: {
    locale: string;
    metricLabel: (key: MetricKey) => string;
    vsLabel: string;
    newDeltaLabel: string;
  }
): KpiCard {
  const delta = heroDelta(key, summary, prevSummary);
  const { change, trend } = deltaMeta(key, delta, args.newDeltaLabel);
  return {
    metricKey: key,
    label: args.metricLabel(key),
    value: formatMetricValue(key, summary[key] ?? 0, args.locale),
    change,
    trend,
    color: METRIC_BY_KEY[key].color,
    sparkData: normalizeSparkSeries(series.map((p) => p[key] ?? 0)),
    sparkLabels: series.map((p) => formatDayLabel(p.day, args.locale)),
    formatSparkValue: (v: number) => formatMetricValue(key, v, args.locale),
    subLabel: args.vsLabel
  };
}

function normalizeSparkSeries(values: number[]): number[] {
  const cleaned = values.map((v) => (Number.isFinite(v) ? v : 0));
  if (cleaned.length >= 2) return cleaned;
  if (cleaned.length === 1) return [cleaned[0], cleaned[0]];
  return [0, 0];
}

function buildPeriodMetric(
  key: MetricKey,
  summary: Summary,
  prevSummary: Summary | null,
  args: {
    locale: string;
    metricLabel: (key: MetricKey) => string;
    vsLabel: string;
    newDeltaLabel: string;
  }
): SecondaryMetric {
  const delta = heroDelta(key, summary, prevSummary);
  const { change, trend } = deltaMeta(key, delta, args.newDeltaLabel);
  return {
    key,
    label: args.metricLabel(key),
    value: formatMetricValue(key, summary[key] ?? 0, args.locale),
    change,
    trend,
    subLabel: args.vsLabel,
    color: METRIC_BY_KEY[key].color
  };
}

export function toMetricPrismProps(args: {
  summary: Summary;
  prevSummary: Summary | null;
  series: SeriesPoint[];
  dominantPreset?: string;
  heroMetrics?: MetricKey[];
  periodMetrics?: MetricKey[];
  locale: string;
  metricLabel: (key: MetricKey) => string;
  vsLabel: string;
  newDeltaLabel?: string;
}): { primaryKPIs: KpiCard[]; secondaryMetrics: SecondaryMetric[] } {
  const {
    summary,
    prevSummary,
    series,
    dominantPreset,
    heroMetrics,
    periodMetrics,
    locale,
    metricLabel,
    vsLabel,
    newDeltaLabel = "Novo"
  } = args;
  const cardArgs = { locale, metricLabel, vsLabel, newDeltaLabel };
  const presetHero = presetMetricsFor(dominantPreset).slice(0, MAX_HERO_METRICS);
  const heroKeys = resolveHeroMetricKeys(heroMetrics ?? [], presetHero);

  const primaryKPIs: KpiCard[] = heroKeys.map((key) =>
    buildKpiCard(key, summary, prevSummary, series, cardArgs)
  );

  const secondaryKeys = resolvePeriodMetricKeys(periodMetrics ?? []);
  const secondaryMetrics: SecondaryMetric[] = secondaryKeys.map((key) =>
    buildPeriodMetric(key, summary, prevSummary, cardArgs)
  );

  return { primaryKPIs, secondaryMetrics };
}

export function toChartData(series: SeriesPoint[], locale: string) {
  const sorted = [...series].sort((a, b) => a.day.localeCompare(b.day));
  const mapped = sorted.map((p) => ({ ...p, label: formatDayLabel(p.day, locale) }));
  if (mapped.length === 1) {
    return [mapped[0], { ...mapped[0], label: mapped[0].label }];
  }
  return mapped;
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
  const spendChange = deltaMeta("spend", spendDelta, "Novo");

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

export type DashboardFunnelStep = {
  id: string;
  label: string;
  value: string;
  numeric: number;
  rateFromPrev: string | null;
};

export type DashboardCampaignStatusBucket = {
  id: string;
  label: string;
  count: number;
  color: string;
};

export type DashboardTopCampaignRow = {
  id: string;
  name: string;
  clientName: string;
  spend: string;
  roas: string;
  status: string;
};

export type DashboardCampaignSnapshot = {
  metaCampaignId: string;
  campaignName: string;
  clientName?: string;
  preset?: string;
  spend?: number;
  roas?: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  messages?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
  cpa?: number | null;
  cpmsg?: number;
  status?: string;
  isDraft?: boolean;
};

export type DashboardProfitCampaignRow = {
  id: string;
  name: string;
  clientName: string;
  profit: number;
  profitLabel: string;
  spendLabel: string;
  roasLabel: string;
};

export type DashboardAdLibrarySegment = {
  id: string;
  label: string;
  count: number;
  sharePct: number;
  color: string;
};

export type DashboardAdLibraryInsights = {
  source: "live" | "sample" | "empty";
  apiConfigured: boolean;
  adsAnalyzed: number;
  formats: DashboardAdLibrarySegment[];
  ctas: DashboardAdLibrarySegment[];
  error?: string | null;
};

function campaignMetrics(row: DashboardCampaignSnapshot): Partial<Record<MetricKey, number>> {
  return {
    spend: row.spend,
    roas: row.roas,
    impressions: row.impressions,
    clicks: row.clicks,
    conversions: row.conversions,
    messages: row.messages,
    ctr: row.ctr,
    cpc: row.cpc,
    cpm: row.cpm,
    cpa: row.cpa ?? undefined,
    cpmsg: row.cpmsg
  };
}

/** Cross-preset score for agency-wide top campaigns (uses each campaign's preset rank spec). */
function compareDashboardCampaigns(
  a: DashboardCampaignSnapshot,
  b: DashboardCampaignSnapshot,
  config: RankConfig
): number {
  const specA = rankSpecFor(a.preset, config);
  const specB = rankSpecFor(b.preset, config);
  const va = rankValue(campaignMetrics(a), specA);
  const vb = rankValue(campaignMetrics(b), specB);

  const scoreA = specA.dir === "desc" ? va : va < Number.POSITIVE_INFINITY && va > 0 ? 1 / va : 0;
  const scoreB = specB.dir === "desc" ? vb : vb < Number.POSITIVE_INFINITY && vb > 0 ? 1 / vb : 0;

  if (scoreB !== scoreA) return scoreB - scoreA;

  const tiebreak = compareByRank(campaignMetrics(a), campaignMetrics(b), specA);
  if (tiebreak !== 0) return tiebreak;

  return (b.spend ?? 0) - (a.spend ?? 0);
}

export function toDashboardFunnelSteps(args: {
  summary: Summary;
  locale: string;
  labels: { impressions: string; clicks: string; pageViews: string; conversions: string };
}): DashboardFunnelStep[] {
  const { summary, locale, labels } = args;
  const impressions = summary.impressions ?? 0;
  const clicks = summary.clicks ?? 0;
  const reach = summary.reach ?? 0;
  const conversions = summary.conversions ?? 0;

  const rate = (from: number, to: number) => {
    if (from <= 0 || to <= 0) return null;
    return formatMetricValue("ctr", (to / from) * 100, locale);
  };

  // Funil: impressões → [alcance] → cliques → conversões (cada etapa estreita).
  // O alcance (reach) só existe no Meta; no Google essa etapa não se aplica, então a
  // omitimos quando não há dado (evita a etapa vazia "—" que o usuário via no Google).
  const steps: DashboardFunnelStep[] = [
    {
      id: "impressions",
      label: labels.impressions,
      value: formatMetricValue("impressions", impressions, locale),
      numeric: impressions,
      rateFromPrev: null
    }
  ];
  if (reach > 0) {
    steps.push({
      id: "reach",
      label: labels.pageViews,
      value: formatMetricValue("reach", reach, locale),
      numeric: reach,
      rateFromPrev: rate(impressions, reach)
    });
  }
  steps.push(
    {
      id: "clicks",
      label: labels.clicks,
      value: formatMetricValue("clicks", clicks, locale),
      numeric: clicks,
      rateFromPrev: rate(reach > 0 ? reach : impressions, clicks)
    },
    {
      id: "conversions",
      label: labels.conversions,
      value: formatMetricValue("conversions", conversions, locale),
      numeric: conversions,
      rateFromPrev: rate(clicks, conversions)
    }
  );
  return steps;
}

export function toDashboardCampaignStatus(args: {
  campaigns: DashboardCampaignSnapshot[];
  labels: { active: string; paused: string; draft: string; other: string };
}): DashboardCampaignStatusBucket[] {
  const buckets = {
    active: 0,
    paused: 0,
    draft: 0,
    other: 0
  };

  for (const row of args.campaigns) {
    if (row.isDraft) {
      buckets.draft += 1;
      continue;
    }
    const status = (row.status ?? "").toUpperCase();
    if (status === "ACTIVE") buckets.active += 1;
    else if (status === "PAUSED") buckets.paused += 1;
    else buckets.other += 1;
  }

  return [
    { id: "active", label: args.labels.active, count: buckets.active, color: "#10b981" },
    { id: "paused", label: args.labels.paused, count: buckets.paused, color: "#f59e0b" },
    { id: "draft", label: args.labels.draft, count: buckets.draft, color: "#94a3b8" },
    { id: "other", label: args.labels.other, count: buckets.other, color: "#64748b" }
  ];
}

export function toDashboardTopCampaigns(args: {
  campaigns: DashboardCampaignSnapshot[];
  locale: string;
  limit?: number;
  rankConfig?: RankConfig;
}): DashboardTopCampaignRow[] {
  const { campaigns, locale, limit = 5, rankConfig = DEFAULT_RANK_CONFIG } = args;
  return [...campaigns]
    .filter(
      (row) =>
        !row.isDraft &&
        ((row.spend ?? 0) > 0 || meetsMinActivity(campaignMetrics(row), rankConfig))
    )
    .sort((a, b) => compareDashboardCampaigns(a, b, rankConfig))
    .slice(0, limit)
    .map((row) => ({
      id: row.metaCampaignId,
      name: row.campaignName,
      clientName: row.clientName ?? "—",
      spend: formatBRL(row.spend ?? 0, locale),
      roas: formatRoas(row.roas ?? 0, locale),
      status: row.status ?? "—"
    }));
}

export function toDashboardTopCampaignsBySpend(args: {
  campaigns: DashboardCampaignSnapshot[];
  locale: string;
  limit?: number;
}): DashboardTopCampaignRow[] {
  const { campaigns, locale, limit = 5 } = args;
  return [...campaigns]
    .filter((row) => !row.isDraft && (row.spend ?? 0) > 0)
    .sort((a, b) => (b.spend ?? 0) - (a.spend ?? 0))
    .slice(0, limit)
    .map((row) => ({
      id: `${row.metaCampaignId}-spend`,
      name: row.campaignName,
      clientName: row.clientName ?? "—",
      spend: formatBRL(row.spend ?? 0, locale),
      roas: formatRoas(row.roas ?? 0, locale),
      status: row.status ?? "—"
    }));
}

const OBJECTIVE_COLORS = ["#7c3aed", "#6366f1", "#14b8a6", "#10b981", "#f59e0b", "#ec4899", "#64748b"];

export function toDashboardObjectiveBreakdown(args: {
  campaigns: DashboardCampaignSnapshot[];
  labelForPreset?: (preset: string) => string;
}): DashboardCampaignStatusBucket[] {
  const counts = new Map<string, number>();
  for (const row of args.campaigns) {
    if (row.isDraft) continue;
    const key = row.preset ?? "default";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([preset, count], index) => ({
      id: `objective-${preset}`,
      label: args.labelForPreset?.(preset) ?? preset,
      count,
      color: OBJECTIVE_COLORS[index % OBJECTIVE_COLORS.length]
    }));
}

export function toDashboardProfitByCampaign(args: {
  campaigns: DashboardCampaignSnapshot[];
  locale: string;
  limit?: number;
}): DashboardProfitCampaignRow[] {
  const { campaigns, locale, limit = 6 } = args;
  return [...campaigns]
    .filter((row) => !row.isDraft && (row.spend ?? 0) > 0)
    .map((row) => {
      const spend = row.spend ?? 0;
      const roas = row.roas ?? 0;
      const profit = spend * roas - spend;
      return {
        id: row.metaCampaignId,
        name: row.campaignName,
        clientName: row.clientName ?? "—",
        profit,
        profitLabel: formatBRL(profit, locale),
        spendLabel: formatBRL(spend, locale),
        roasLabel: formatRoas(roas, locale)
      };
    })
    .sort((a, b) => b.profit - a.profit)
    .slice(0, limit);
}
