import "server-only";

import { Between } from "typeorm";

import { repositories } from "@/db/repositories";
import { slugify } from "@/lib/app-context";
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

export async function getCampaignDetail(input: {
  metaCampaignId: string;
  period: ParsedPeriod;
  metaAccessToken?: string | null;
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

  const latest = snaps.sort((a, b) => b.day.localeCompare(a.day))[0];
  let clientSlug = "";
  let clientName = "—";
  let accountLabel = "—";
  let metaAdAccountId = "";
  let objective = "leads";

  if (latest?.adAccountId) {
    const acc = await adRepo.findOne({ where: { id: latest.adAccountId } });
    if (acc) {
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
  }

  let live = null;
  if (input.metaAccessToken) {
    try {
      live = await fetchCampaign(input.metaAccessToken, input.metaCampaignId);
    } catch {
      live = null;
    }
  }

  if (input.metaAccessToken && (spend === 0 || conversions === 0)) {
    try {
      const insight = await fetchCampaignInsightForRange(
        input.metaAccessToken,
        input.metaCampaignId,
        since,
        until
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
      }
    } catch {
      /* keep snapshot */
    }
  }

  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

  return {
    campaign: {
      id: input.metaCampaignId,
      name: live?.name ?? snaps[0]?.campaignName ?? input.metaCampaignId,
      status: live?.status ?? "UNKNOWN",
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
        roas: roasN ? roasSum / roasN : 0,
        cpl: leads > 0 ? spend / leads : null,
        cpa: conversions > 0 ? spend / conversions : null
      }
    }
  };
}

export async function getCampaignTimeseries(input: {
  metaCampaignId: string;
  period: ParsedPeriod;
  metaAccessToken?: string | null;
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

  if (!series.length && input.metaAccessToken) {
    try {
      const daily = await fetchCampaignInsightsDailyForCampaign(
        input.metaAccessToken,
        input.metaCampaignId,
        since,
        until
      );
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
    } catch {
      /* empty */
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
