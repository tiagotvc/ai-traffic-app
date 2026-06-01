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
  pickResults
} from "@/lib/meta-graph";
import type { ParsedPeriod } from "@/lib/report-period";
import { rollingDaysEndingYesterday, yesterdayIso } from "@/lib/report-period";

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
  let roasSum = 0;
  let roasN = 0;

  for (const s of snaps) {
    spend += num(s.spend);
    conversions += num(s.conversions);
    leads += num(s.leads);
    impressions += num(s.impressions);
    clicks += num(s.clicks);
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

  const live = await fetchCampaignLive(
    input.metaCampaignId,
    input.metaAccessToken,
    input.fallbackMetaToken
  );
  if (live) {
    status = live.status ?? status;
    if (live.objective) objective = live.objective;
  }

  const insight = await fetchInsightLive(
    input.metaCampaignId,
    since,
    until,
    input.metaAccessToken,
    input.fallbackMetaToken
  );
  if (insight) {
    spend = Number(insight.spend) || spend;
    conversions = pickResults(insight) || conversions;
    leads = pickLeads(insight.actions) || leads;
    impressions = Number(insight.impressions) || impressions;
    clicks = Number(insight.clicks) || clicks;
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
      name: live?.name ?? input.hints?.campaignName ?? latestInPeriod?.campaignName ?? input.metaCampaignId,
      status: live?.status ?? status,
      dailyBudget: live?.daily_budget ? Number(live.daily_budget) / 100 : null,
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
        ctr,
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
}) {
  const { campaignMetricSnapshot: campRepo } = await repositories();
  const { since, until } = resolveSinceUntil(input.period);

  const snaps = input.period.allTime
    ? await campRepo.find({ where: { metaCampaignId: input.metaCampaignId }, order: { day: "ASC" } })
    : await campRepo.find({
        where: { metaCampaignId: input.metaCampaignId, day: Between(since, until) },
        order: { day: "ASC" }
      });

  let series = snaps.map((s) => {
    const spend = num(s.spend);
    const conversions = num(s.conversions);
    return {
      day: s.day,
      spend,
      conversions,
      cpa: conversions > 0 ? spend / conversions : null,
      roas: num(s.roas)
    };
  });

  if (!series.length) {
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
              const conversions = pickResults(r);
              return {
                day: r.date_start,
                spend,
                conversions,
                cpa: conversions > 0 ? spend / conversions : null,
                roas: Number(r.purchase_roas?.[0]?.value) || 0
              };
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

  const sum = (arr: typeof series, key: "spend" | "conversions") =>
    arr.reduce((a, b) => a + b[key], 0);

  const prevSpend = sum(prevSlice, "spend");
  const prevConv = sum(prevSlice, "conversions");
  const curSpend = sum(curSlice, "spend");
  const curConv = sum(curSlice, "conversions");

  return {
    series,
    previous: {
      spend: prevSpend,
      conversions: prevConv,
      cpa: prevConv > 0 ? prevSpend / prevConv : null,
      roas: prevSlice.length
        ? prevSlice.reduce((a, b) => a + b.roas, 0) / prevSlice.length
        : 0
    },
    current: {
      spend: curSpend,
      conversions: curConv,
      cpa: curConv > 0 ? curSpend / curConv : null,
      roas: curSlice.length ? curSlice.reduce((a, b) => a + b.roas, 0) / curSlice.length : 0
    }
  };
}
