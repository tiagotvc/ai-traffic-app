import "server-only";

import { Between } from "typeorm";

import { repositories } from "@/db/repositories";
import { getClientBySlugOrId, slugify } from "@/lib/app-context";
import { num } from "@/lib/goal-types";
import {
  fetchCampaign,
  fetchCampaignInsightForRange,
  fetchCampaignInsightsDailyForCampaign,
  pickLeads,
  pickMessages,
  pickResults
} from "@/lib/meta-graph";
import type { MetricKey } from "@/lib/dashboard-metrics";
import type { ParsedPeriod } from "@/lib/report-period";
import { normalizeDayKey, rollingDaysEndingYesterday, yesterdayIso } from "@/lib/report-period";

export type CampaignDetailHints = {
  metaAdAccountId?: string;
  clientSlug?: string;
  campaignName?: string;
  status?: string;
  objective?: string;
  spend?: number;
  conversions?: number;
  leads?: number;
  roas?: number;
  cpa?: number | null;
};

function resolveSinceUntil(period: ParsedPeriod) {
  if (period.allTime) {
    const since = new Date();
    since.setFullYear(since.getFullYear() - 2);
    return { since: since.toISOString().slice(0, 10), until: yesterdayIso() };
  }
  const fallback = rollingDaysEndingYesterday(7);
  return {
    since: period.since ?? fallback.since,
    until: period.until ?? fallback.until
  };
}

export type CampaignMetricSeriesPoint = {
  day: string;
  spend: number;
  impressions: number;
  reach: number;
  frequency: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  cpa: number | null;
  messages: number;
  cpmsg: number;
  roas: number;
};

function buildCampaignSeriesPoint(
  day: string,
  raw: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    reach: number;
    messages: number;
    roas: number;
  }
): CampaignMetricSeriesPoint {
  const { spend, impressions, clicks, conversions, reach, messages, roas } = raw;
  return {
    day,
    spend,
    impressions,
    reach,
    messages,
    clicks,
    conversions,
    roas,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    cpa: conversions > 0 ? spend / conversions : null,
    cpmsg: messages > 0 ? spend / messages : 0,
    frequency: reach > 0 ? impressions / reach : 0
  };
}

function aggregateCampaignSeries(slice: CampaignMetricSeriesPoint[]): Record<MetricKey, number> {
  const spend = slice.reduce((a, b) => a + b.spend, 0);
  const impressions = slice.reduce((a, b) => a + b.impressions, 0);
  const clicks = slice.reduce((a, b) => a + b.clicks, 0);
  const conversions = slice.reduce((a, b) => a + b.conversions, 0);
  const reach = slice.reduce((a, b) => a + b.reach, 0);
  const messages = slice.reduce((a, b) => a + b.messages, 0);
  const roas =
    slice.length > 0 ? slice.reduce((a, b) => a + b.roas, 0) / slice.length : 0;
  const point = buildCampaignSeriesPoint("", {
    spend,
    impressions,
    clicks,
    conversions,
    reach,
    messages,
    roas
  });
  return {
    spend: point.spend,
    impressions: point.impressions,
    reach: point.reach,
    frequency: point.frequency,
    clicks: point.clicks,
    ctr: point.ctr,
    cpc: point.cpc,
    cpm: point.cpm,
    conversions: point.conversions,
    cpa: point.cpa ?? 0,
    messages: point.messages,
    cpmsg: point.cpmsg,
    roas: point.roas
  };
}

async function fetchCampaignLive(
  metaCampaignId: string,
  primaryToken?: string | null,
  fallbackToken?: string | null
) {
  for (const token of [primaryToken, fallbackToken]) {
    if (!token) continue;
    try {
      return await fetchCampaign(token, metaCampaignId);
    } catch {
      /* try next token */
    }
  }
  return null;
}

async function fetchInsightLive(
  metaCampaignId: string,
  since: string,
  until: string,
  primaryToken?: string | null,
  fallbackToken?: string | null
) {
  for (const token of [primaryToken, fallbackToken]) {
    if (!token) continue;
    try {
      const insight = await fetchCampaignInsightForRange(token, metaCampaignId, since, until);
      if (insight) return insight;
    } catch {
      /* try next token */
    }
  }
  return null;
}

export async function getCampaignDetail(input: {
  metaCampaignId: string;
  period: ParsedPeriod;
  tenantId: string;
  metaAccessToken?: string | null;
  fallbackMetaToken?: string | null;
  hints?: CampaignDetailHints;
  live?: boolean;
}) {
  const { campaignMetricSnapshot: campRepo, adAccount: adRepo, client: clientRepo, clientMetaSettings: settingsRepo } =
    await repositories();

  const { since, until } = resolveSinceUntil(input.period);

  const snaps = input.period.allTime
    ? await campRepo.find({ where: { metaCampaignId: input.metaCampaignId } })
    : await campRepo.find({
        where: { metaCampaignId: input.metaCampaignId, day: Between(since, until) }
      });

  let spend = 0;
  let conversions = 0;
  let leads = 0;
  let impressions = 0;
  let clicks = 0;
  let reach = 0;
  let messages = 0;
  let roasSum = 0;
  let roasN = 0;

  for (const s of snaps) {
    spend += num(s.spend);
    conversions += num(s.conversions);
    leads += num(s.leads);
    impressions += num(s.impressions);
    clicks += num(s.clicks);
    reach += num(s.reach);
    messages += num(s.messages);
    const roas = num(s.roas);
    if (roas > 0) {
      roasSum += roas;
      roasN += 1;
    }
  }

  let clientSlug = input.hints?.clientSlug ?? "";
  let clientName = "—";
  let accountLabel = "—";
  let metaAdAccountId = input.hints?.metaAdAccountId ?? "";
  let objective = input.hints?.objective ?? "leads";
  let status = input.hints?.status ?? "UNKNOWN";

  async function applyAccount(acc: Awaited<ReturnType<typeof adRepo.findOne>>) {
    if (!acc) return;
    metaAdAccountId = acc.metaAdAccountId;
    accountLabel = acc.label ?? acc.metaAdAccountId;
    const client = await clientRepo.findOne({ where: { id: acc.clientId } });
    if (client) {
      clientName = client.name;
      clientSlug = slugify(client.name);
      const settings = await settingsRepo.findOne({ where: { clientId: client.id } });
      if (settings?.defaultObjective) objective = settings.defaultObjective;
    }
  }

  if (metaAdAccountId) {
    await applyAccount(await adRepo.findOne({ where: { metaAdAccountId } }));
  }

  if (!metaAdAccountId && input.hints?.clientSlug) {
    const client = await getClientBySlugOrId(input.tenantId, input.hints.clientSlug);
    if (client) {
      clientName = client.name;
      clientSlug = slugify(client.name);
      const acc = await adRepo.findOne({ where: { clientId: client.id } });
      if (acc) await applyAccount(acc);
    }
  }

  const latestInPeriod = snaps.sort((a, b) => b.day.localeCompare(a.day))[0];
  if (latestInPeriod?.adAccountId) {
    await applyAccount(await adRepo.findOne({ where: { id: latestInPeriod.adAccountId } }));
  }

  if (!metaAdAccountId) {
    const anySnap = await campRepo.findOne({
      where: { metaCampaignId: input.metaCampaignId },
      order: { day: "DESC" }
    });
    if (anySnap?.adAccountId) {
      await applyAccount(await adRepo.findOne({ where: { id: anySnap.adAccountId } }));
    }
  }

  const useLive = input.live !== false;
  let liveCampaign: Awaited<ReturnType<typeof fetchCampaignLive>> = null;
  if (useLive) {
    liveCampaign = await fetchCampaignLive(
      input.metaCampaignId,
      input.metaAccessToken,
      input.fallbackMetaToken
    );
    if (liveCampaign) {
      status = liveCampaign.status ?? status;
      if (liveCampaign.objective) objective = liveCampaign.objective;
    }
  }

  const insight = useLive
    ? await fetchInsightLive(
        input.metaCampaignId,
        since,
        until,
        input.metaAccessToken,
        input.fallbackMetaToken
      )
    : null;
  if (insight) {
    spend = Number(insight.spend) || spend;
    conversions = pickResults(insight) || conversions;
    leads = pickLeads(insight.actions) || leads;
    messages = pickMessages(insight.actions) || messages;
    impressions = Number(insight.impressions) || impressions;
    clicks = Number(insight.clicks) || clicks;
    reach = Number(insight.reach) || reach;
    const roas = Number(insight.purchase_roas?.[0]?.value);
    if (roas > 0) {
      roasSum = roas;
      roasN = 1;
    }
  } else if (spend === 0 && conversions === 0 && input.hints) {
    spend = num(input.hints.spend);
    conversions = num(input.hints.conversions);
    leads = num(input.hints.leads);
    if (input.hints.roas && input.hints.roas > 0) {
      roasSum = input.hints.roas;
      roasN = 1;
    }
  }

  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpaHint = input.hints?.cpa;
  const cpa =
    conversions > 0 ? spend / conversions : cpaHint != null && cpaHint > 0 ? cpaHint : null;

  return {
    campaign: {
      id: input.metaCampaignId,
      name:
        liveCampaign?.name ??
        input.hints?.campaignName ??
        latestInPeriod?.campaignName ??
        input.metaCampaignId,
      status: liveCampaign?.status ?? status,
      dailyBudget: liveCampaign?.daily_budget ? Number(liveCampaign.daily_budget) / 100 : null,
      clientSlug,
      clientName,
      accountLabel,
      metaAdAccountId,
      objective,
      kpis: {
        spend,
        conversions,
        leads,
        impressions,
        clicks,
        reach,
        messages,
        ctr,
        cpc: clicks > 0 ? spend / clicks : 0,
        cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
        cpmsg: messages > 0 ? spend / messages : 0,
        frequency: reach > 0 ? impressions / reach : 0,
        roas: roasN ? roasSum / roasN : input.hints?.roas ?? 0,
        cpl: leads > 0 ? spend / leads : null,
        cpa
      }
    }
  };
}

export async function getCampaignTimeseries(input: {
  metaCampaignId: string;
  period: ParsedPeriod;
  metaAccessToken?: string | null;
  fallbackMetaToken?: string | null;
  live?: boolean;
}) {
  const { campaignMetricSnapshot: campRepo } = await repositories();
  const { since, until } = resolveSinceUntil(input.period);

  const snaps = input.period.allTime
    ? await campRepo.find({ where: { metaCampaignId: input.metaCampaignId }, order: { day: "ASC" } })
    : await campRepo.find({
        where: { metaCampaignId: input.metaCampaignId, day: Between(since, until) },
        order: { day: "ASC" }
      });

  let series: CampaignMetricSeriesPoint[] = snaps.map((s) =>
    buildCampaignSeriesPoint(normalizeDayKey(String(s.day)), {
      spend: num(s.spend),
      impressions: num(s.impressions),
      clicks: num(s.clicks),
      conversions: num(s.conversions),
      reach: num(s.reach),
      messages: num(s.messages),
      roas: num(s.roas)
    })
  );

  const snapshotSpend = series.reduce((a, b) => a + b.spend, 0);
  const snapshotConversions = series.reduce((a, b) => a + b.conversions, 0);
  const needsLiveDaily =
    input.live !== false &&
    (!series.length || (snapshotSpend === 0 && snapshotConversions === 0));

  if (needsLiveDaily) {
    for (const token of [input.metaAccessToken, input.fallbackMetaToken]) {
      if (!token) continue;
      try {
        const daily = await fetchCampaignInsightsDailyForCampaign(
          token,
          input.metaCampaignId,
          since,
          until
        );
        if (daily.length) {
          series = daily
            .filter((r) => r.date_start)
            .map((r) => {
              const spend = Number(r.spend) || 0;
              const impressions = Number(r.impressions) || 0;
              const clicks = Number(r.clicks) || 0;
              const conversions = pickResults(r);
              const reach = Number(r.reach) || 0;
              const messages = pickMessages(r.actions);
              return buildCampaignSeriesPoint(normalizeDayKey(String(r.date_start)), {
                spend,
                impressions,
                clicks,
                conversions,
                reach,
                messages,
                roas: Number(r.purchase_roas?.[0]?.value) || 0
              });
            });
          break;
        }
      } catch {
        /* try fallback token */
      }
    }
  }

  const mid = Math.floor(series.length / 2);
  const prevSlice = series.slice(0, mid);
  const curSlice = series.slice(mid);
  const previous = aggregateCampaignSeries(prevSlice);
  const current = aggregateCampaignSeries(curSlice);

  return {
    series,
    previous,
    current
  };
}
