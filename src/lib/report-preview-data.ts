import "server-only";

import { Between, In } from "typeorm";

import { repositories } from "@/db/repositories";
import type { GoalObjective } from "@/db/entities/ClientGoal";
import { getClientBySlugOrId, slugify } from "@/lib/app-context";
import { presetMetricsFor } from "@/lib/campaign-presets";
import type { MetricKey } from "@/lib/dashboard-metrics";
import {
  loadMetricSeriesByDay,
  loadMetricTotals,
  resolveDashboardScope
} from "@/lib/dashboard-query";
import { pctDelta, type Range } from "@/lib/dashboard-ranges";
import { generateReportClaudeAnalysis } from "@/lib/report-ai-analysis";
import { isPlatformFeatureEnabled } from "@/lib/feature-flags/service";
import { loadReportBreakdowns } from "@/lib/report-breakdown-data";
import {
  generateReportNarrative,
  generateReportRecommendations
} from "@/lib/report-narrative";
import {
  DEFAULT_REPORT_METRICS,
  type CampaignSpendRow,
  type ReportPreviewPayload,
  type ReportSummary
} from "@/lib/report-preview-types";
import { normalizeDayKey, type ParsedPeriod } from "@/lib/report-period";

export { DEFAULT_REPORT_METRICS };
export type { ReportPreviewPayload };

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function buildSummary(totals: Awaited<ReturnType<typeof loadMetricTotals>>): ReportSummary {
  const { spend, impressions, clicks, conversions, reach, messages, roas } = totals;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
  const cpmsg = messages > 0 ? spend / messages : 0;
  const frequency = reach > 0 ? impressions / reach : 0;
  const cpa = conversions > 0 ? spend / conversions : 0;
  return {
    spend,
    impressions,
    clicks,
    ctr,
    cpc,
    cpm,
    conversions,
    reach,
    messages,
    cpmsg,
    frequency,
    roas,
    cpa
  };
}

function goalMetricFor(objective: GoalObjective, dominantPreset: string): MetricKey {
  if (dominantPreset === "lead_whatsapp") return "messages";
  if (dominantPreset === "sales") return "conversions";
  if (objective === "sales") return "conversions";
  if (objective === "traffic") return "clicks";
  return "conversions";
}

async function dominantPresetForClient(
  tenantId: string,
  clientId: string,
  accountIds: string[]
): Promise<string> {
  const { campaignPreset: presetRepo, campaignMetricSnapshot: campRepo } = await repositories();
  if (!accountIds.length) return "default";

  const presetRows = await presetRepo.find({ where: { tenantId } });
  const presetByCampaign = new Map(presetRows.map((r) => [r.metaCampaignId, r.preset]));

  const since = normalizeDayKey(new Date(Date.now() - 30 * 86_400_000).toISOString());
  const until = normalizeDayKey(new Date().toISOString());
  const rows = await campRepo.find({
    where: { adAccountId: In(accountIds), day: Between(since, until) }
  });

  const counts = new Map<string, number>();
  for (const r of rows) {
    const preset = presetByCampaign.get(r.metaCampaignId) ?? "default";
    counts.set(preset, (counts.get(preset) ?? 0) + 1);
  }
  let best = "default";
  let bestN = 0;
  for (const [p, n] of counts) {
    if (n > bestN) {
      best = p;
      bestN = n;
    }
  }
  return best;
}

async function loadCampaignSpend(
  accountIds: string[],
  range: Range
): Promise<CampaignSpendRow[]> {
  const { campaignMetricSnapshot: campRepo } = await repositories();
  const rows = await campRepo.find({
    where: { adAccountId: In(accountIds), day: Between(range.since, range.until) }
  });

  const byCampaign = new Map<
    string,
    { name: string; spend: number; conversions: number; clicks: number }
  >();

  for (const r of rows) {
    const cur = byCampaign.get(r.metaCampaignId) ?? {
      name: r.campaignName ?? r.metaCampaignId,
      spend: 0,
      conversions: 0,
      clicks: 0
    };
    cur.spend += num(r.spend);
    cur.conversions += num(r.conversions);
    cur.clicks += num(r.clicks);
    if (r.campaignName) cur.name = r.campaignName;
    byCampaign.set(r.metaCampaignId, cur);
  }

  const totalSpend = [...byCampaign.values()].reduce((s, c) => s + c.spend, 0);
  return [...byCampaign.entries()]
    .map(([metaCampaignId, c]) => ({
      metaCampaignId,
      name: c.name,
      spend: c.spend,
      conversions: c.conversions,
      clicks: c.clicks,
      sharePct: totalSpend > 0 ? (c.spend / totalSpend) * 100 : 0
    }))
    .sort((a, b) => b.spend - a.spend);
}

function seriesToSummaryRows(
  rows: Awaited<ReturnType<typeof loadMetricSeriesByDay>>
): Array<{ day: string } & ReportSummary> {
  return rows.map((d) => {
    const spend = d.spend;
    const impressions = d.impressions;
    const clicks = d.clicks;
    const conversions = d.conversions;
    const reach = d.reach;
    const messages = d.messages;
    return {
      day: normalizeDayKey(d.day),
      spend,
      impressions,
      clicks,
      conversions,
      reach,
      messages,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
      cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
      cpa: conversions > 0 ? spend / conversions : 0,
      cpmsg: messages > 0 ? spend / messages : 0,
      frequency: reach > 0 ? impressions / reach : 0,
      roas: d.roas
    };
  });
}

function formatRangeLabel(range: Range, locale: string): string {
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "pt-BR", {
    day: "2-digit",
    month: "short"
  });
  try {
    return `${fmt.format(new Date(range.since))} – ${fmt.format(new Date(range.until))}`;
  } catch {
    return `${range.since} – ${range.until}`;
  }
}

export async function buildReportPreview(input: {
  tenantId: string;
  clientParam: string;
  adAccountId?: string | null;
  current: Range;
  previous: Range;
  locale: string;
  reportType: "simple" | "complete";
  goalLabel: string;
  metaAccessToken?: string;
}): Promise<ReportPreviewPayload | { ok: false; error: string }> {
  const client = await getClientBySlugOrId(input.tenantId, input.clientParam);
  if (!client) return { ok: false, error: "client_not_found" };

  const clientSlug = slugify(client.name);
  const { accountIds, adAccounts } = await resolveDashboardScope(
    input.tenantId,
    clientSlug,
    input.adAccountId ?? null
  );
  const matchedAccount =
    input.adAccountId && adAccounts.length
      ? adAccounts.find(
          (a) => a.id === input.adAccountId || a.metaAdAccountId === input.adAccountId
        )
      : undefined;
  const selectedAccount = matchedAccount
    ? {
        id: matchedAccount.id,
        metaAdAccountId: matchedAccount.metaAdAccountId,
        label: matchedAccount.label ?? matchedAccount.metaAdAccountId
      }
    : null;

  const dominantPreset = await dominantPresetForClient(input.tenantId, client.id, accountIds);

  const { clientGoal: goalRepo } = await repositories();
  const goalRow = await goalRepo.findOne({ where: { clientId: client.id } });
  const goalObjective = (goalRow?.objective ?? "leads") as GoalObjective;
  const goalMetric = goalMetricFor(goalObjective, dominantPreset);

  const periodOpts = (range: Range): ParsedPeriod => ({
    preset: "custom",
    since: range.since,
    until: range.until,
    days: null,
    allTime: false
  });

  const empty = buildSummary({
    spend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    reach: 0,
    messages: 0,
    roas: 0
  });

  let summary = empty;
  let previousSummary: ReportSummary | null = null;
  let series: ReportPreviewPayload["series"] = [];
  let previousSeries: ReportPreviewPayload["previousSeries"] = [];
  let campaigns: CampaignSpendRow[] = [];

  if (accountIds.length) {
    const [curTotals, prevTotals, curSeries, prevSeriesRows, campaignRows] = await Promise.all([
      loadMetricTotals(accountIds, undefined, {
        since: input.current.since,
        until: input.current.until,
        allTime: false
      }),
      loadMetricTotals(accountIds, undefined, {
        since: input.previous.since,
        until: input.previous.until,
        allTime: false
      }),
      loadMetricSeriesByDay(accountIds, undefined, periodOpts(input.current)),
      loadMetricSeriesByDay(accountIds, undefined, periodOpts(input.previous)),
      loadCampaignSpend(accountIds, input.current)
    ]);
    summary = buildSummary(curTotals);
    previousSummary = buildSummary(prevTotals);
    series = seriesToSummaryRows(curSeries);
    previousSeries = seriesToSummaryRows(prevSeriesRows);
    campaigns = campaignRows;
  }

  const comparisonKeys: MetricKey[] = ["spend", "clicks", goalMetric, "ctr", "cpm"];
  const comparisonBars = comparisonKeys.map((key) => ({
    key,
    current: summary[key] ?? 0,
    previous: previousSummary?.[key] ?? 0,
    delta:
      previousSummary && (previousSummary[key] ?? 0) > 0
        ? pctDelta(summary[key] ?? 0, previousSummary[key] ?? 0)
        : null
  }));

  // v2 (com IA): análise e anomalias só quando o Relatório v2 está ligado.
  const reportsV2Enabled = await isPlatformFeatureEnabled("reports.v2");

  // R2.8 — anomalias: métricas-resultado com desvio relevante vs período anterior.
  const ANOMALY_THRESHOLD = 25;
  const NEUTRAL_KEYS = new Set<MetricKey>(["spend", "impressions", "reach", "frequency"]);
  const BAD_IF_UP = new Set<MetricKey>(["cpa", "cpc", "cpm", "cpmsg"]);
  const anomalies = reportsV2Enabled
    ? comparisonBars
        .filter(
          (b) =>
            !NEUTRAL_KEYS.has(b.key) && b.delta != null && Math.abs(b.delta) >= ANOMALY_THRESHOLD
        )
        .map((b) => {
          const up = (b.delta as number) > 0;
          const bad = BAD_IF_UP.has(b.key) ? up : !up;
          return {
            key: b.key,
            delta: b.delta as number,
            direction: (bad ? "bad" : "good") as "good" | "bad"
          };
        })
    : [];

  const currentLabel = formatRangeLabel(input.current, input.locale);
  const previousLabel = formatRangeLabel(input.previous, input.locale);

  const narrative = generateReportNarrative({
    locale: input.locale,
    current: summary,
    previous: previousSummary,
    goalMetric,
    goalLabel: input.goalLabel,
    periodLabel: currentLabel,
    prevPeriodLabel: previousLabel
  });

  const recommendations =
    input.reportType === "complete"
      ? generateReportRecommendations({
          locale: input.locale,
          current: summary,
          previous: previousSummary,
          goalMetric,
          goalLabel: input.goalLabel,
          topCampaigns: campaigns.slice(0, 5).map((c) => ({
            name: c.name,
            spend: c.spend,
            conversions: c.conversions
          }))
        })
      : [];

  let aiAnalysis = null;
  if (input.reportType === "complete" && reportsV2Enabled) {
    aiAnalysis = await generateReportClaudeAnalysis({
      locale: input.locale,
      clientName: client.name,
      accountLabel: selectedAccount?.label,
      periodLabel: currentLabel,
      prevPeriodLabel: previousLabel,
      summary,
      previousSummary,
      goalMetric,
      goalLabel: input.goalLabel,
      campaigns
    });
  }

  const finalRecommendations =
    aiAnalysis?.recommendations.length ? aiAnalysis.recommendations : recommendations;
  const finalNarrative = aiAnalysis?.executiveSummary ?? narrative;

  let breakdowns: ReportPreviewPayload["breakdowns"] = [];
  if (selectedAccount?.metaAdAccountId) {
    try {
      breakdowns = await loadReportBreakdowns({
        tenantId: input.tenantId,
        metaAdAccountId: selectedAccount.metaAdAccountId,
        since: input.current.since,
        until: input.current.until,
        locale: input.locale,
        accessToken: input.metaAccessToken
      });
    } catch {
      breakdowns = [];
    }
  }

  return {
    ok: true,
    client: {
      id: client.id,
      slug: clientSlug,
      name: client.name,
      dominantPreset,
      goalObjective,
      goalMetric
    },
    adAccount: selectedAccount,
    period: {
      current: input.current,
      previous: input.previous,
      currentLabel,
      previousLabel
    },
    summary,
    previousSummary,
    series,
    previousSeries,
    campaigns,
    comparisonBars,
    anomalies,
    narrative: finalNarrative,
    recommendations: finalRecommendations,
    aiAnalysis,
    breakdowns
  };
}

export function defaultMetricsForClient(dominantPreset: string, goalMetric: MetricKey): MetricKey[] {
  const base = [...DEFAULT_REPORT_METRICS];
  if (!base.includes(goalMetric)) base.push(goalMetric);
  const presetExtras = presetMetricsFor(dominantPreset).filter((k) => !base.includes(k)).slice(0, 1);
  return [...base, ...presetExtras];
}

/* ----------------------------- R3 — Consolidado de agência ----------------------------- */

export type AgencyConsolidatedRow = {
  clientId: string;
  clientSlug: string;
  name: string;
  summary: ReportSummary;
  previousSummary: ReportSummary;
};

export type AgencyConsolidated = {
  rows: AgencyConsolidatedRow[];
  totals: ReportSummary;
  previousTotals: ReportSummary;
  period: { current: Range; previous: Range; currentLabel: string; previousLabel: string };
};

/**
 * Relatório consolidado da carteira (todos os clientes do tenant numa visão).
 * Reusa o mesmo escopo/totais do relatório por cliente — só leitura de snapshots,
 * **sem tocar em ranking/criação**. Gate de flag fica no endpoint (reports.v2).
 */
export async function buildAgencyConsolidated(
  tenantId: string,
  current: Range,
  previous: Range,
  locale = "pt-BR"
): Promise<AgencyConsolidated> {
  const { client: clientRepo } = await repositories();
  const clients = await clientRepo.find({ where: { tenantId }, order: { name: "ASC" } });

  const rows: AgencyConsolidatedRow[] = [];
  const acc = { spend: 0, impressions: 0, clicks: 0, conversions: 0, reach: 0, messages: 0, roas: 0 };
  const prevAcc = { ...acc };
  const RAW_KEYS = ["spend", "impressions", "clicks", "conversions", "reach", "messages"] as const;

  for (const c of clients) {
    const slug = slugify(c.name);
    const { accountIds } = await resolveDashboardScope(tenantId, slug, null);
    if (!accountIds.length) continue;
    const [cur, prev] = await Promise.all([
      loadMetricTotals(accountIds, undefined, {
        since: current.since,
        until: current.until,
        allTime: false
      }),
      loadMetricTotals(accountIds, undefined, {
        since: previous.since,
        until: previous.until,
        allTime: false
      })
    ]);
    rows.push({
      clientId: c.id,
      clientSlug: slug,
      name: c.name,
      summary: buildSummary(cur),
      previousSummary: buildSummary(prev)
    });
    for (const k of RAW_KEYS) {
      acc[k] += cur[k] ?? 0;
      prevAcc[k] += prev[k] ?? 0;
    }
  }

  // Ordena por investimento (maior primeiro).
  rows.sort((a, b) => (b.summary.spend ?? 0) - (a.summary.spend ?? 0));

  return {
    rows,
    totals: buildSummary(acc),
    previousTotals: buildSummary(prevAcc),
    period: {
      current,
      previous,
      currentLabel: formatRangeLabel(current, locale),
      previousLabel: formatRangeLabel(previous, locale)
    }
  };
}
