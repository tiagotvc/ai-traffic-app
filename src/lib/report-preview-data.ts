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

async function dominantPresetForClient(tenantId: string, clientId: string): Promise<string> {
  const { campaignPreset: presetRepo, campaignMetricSnapshot: campRepo, adAccount: adAccountRepo } =
    await repositories();
  const accounts = await adAccountRepo.find({ where: { clientId } });
  const accountIds = accounts.map((a) => a.id);
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
  current: Range;
  previous: Range;
  locale: string;
  reportType: "simple" | "complete";
  goalLabel: string;
}): Promise<ReportPreviewPayload | { ok: false; error: string }> {
  const client = await getClientBySlugOrId(input.tenantId, input.clientParam);
  if (!client) return { ok: false, error: "client_not_found" };

  const { accountIds } = await resolveDashboardScope(input.tenantId, slugify(client.name));
  const dominantPreset = await dominantPresetForClient(input.tenantId, client.id);

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

  return {
    ok: true,
    client: {
      id: client.id,
      slug: slugify(client.name),
      name: client.name,
      dominantPreset,
      goalObjective,
      goalMetric
    },
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
    narrative,
    recommendations
  };
}

export function defaultMetricsForClient(dominantPreset: string, goalMetric: MetricKey): MetricKey[] {
  const base = [...DEFAULT_REPORT_METRICS];
  if (!base.includes(goalMetric)) base.push(goalMetric);
  const presetExtras = presetMetricsFor(dominantPreset).filter((k) => !base.includes(k)).slice(0, 1);
  return [...base, ...presetExtras];
}
