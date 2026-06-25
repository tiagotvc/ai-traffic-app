import "server-only";

import { Between, IsNull, Not } from "typeorm";

import { repositories } from "@/db/repositories";
import { num } from "@/lib/goal-types";
import { type MetricKey } from "@/lib/dashboard-metrics";
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

function metricsFromAgg(raw: {
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  conversions: number;
  messages: number;
  roasSum: number;
  roasN: number;
}): Partial<Record<MetricKey, number>> {
  const { spend, impressions, clicks, reach, conversions, messages, roasSum, roasN } = raw;
  return {
    spend,
    impressions,
    clicks,
    reach,
    conversions,
    messages,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    cpa: conversions > 0 ? spend / conversions : 0,
    cpmsg: messages > 0 ? spend / messages : 0,
    frequency: reach > 0 ? impressions / reach : 0,
    roas: roasN > 0 ? roasSum / roasN : 0
  };
}

export type SnapshotAdsetRow = {
  id: string;
  name?: string;
  status?: string;
  dailyBudget: number | null;
  spend: number;
  conversions: number;
  cpa: number | null;
  roas: number;
  reach: number;
  clicks: number;
  ctr: number;
  metrics?: Partial<Record<MetricKey, number>>;
};

export type SnapshotAdRow = {
  id: string;
  name?: string;
  status?: string;
  adsetId: string;
  adsetName?: string;
  metrics?: Partial<Record<MetricKey, number>> | null;
};

export async function loadAdsetsFromSnapshots(
  metaCampaignId: string,
  period: ParsedPeriod
): Promise<SnapshotAdsetRow[]> {
  const { adMetricSnapshot: repo } = await repositories();
  const { since, until } = resolveSinceUntil(period);

  const snaps = period.allTime
    ? await repo.find({
        where: { metaCampaignId, metaAdId: IsNull() },
        order: { day: "ASC" }
      })
    : await repo.find({
        where: { metaCampaignId, metaAdId: IsNull(), day: Between(since, until) },
        order: { day: "ASC" }
      });

  const byAdset = new Map<
    string,
    {
      name: string | null;
      spend: number;
      impressions: number;
      clicks: number;
      reach: number;
      conversions: number;
      messages: number;
      roasSum: number;
      roasN: number;
    }
  >();

  for (const s of snaps) {
    const id = s.metaAdsetId;
    const ex = byAdset.get(id) ?? {
      name: s.adsetName ?? null,
      spend: 0,
      impressions: 0,
      clicks: 0,
      reach: 0,
      conversions: 0,
      messages: 0,
      roasSum: 0,
      roasN: 0
    };
    if (s.adsetName) ex.name = s.adsetName;
    ex.spend += num(s.spend);
    ex.impressions += num(s.impressions);
    ex.clicks += num(s.clicks);
    ex.reach += num(s.reach);
    ex.conversions += num(s.conversions);
    ex.messages += num(s.messages);
    const roas = num(s.roas);
    if (roas > 0) {
      ex.roasSum += roas;
      ex.roasN += 1;
    }
    byAdset.set(id, ex);
  }

  return [...byAdset.entries()].map(([id, agg]) => {
    const spend = agg.spend;
    const conversions = agg.conversions;
    const impressions = agg.impressions;
    const clicks = agg.clicks;
    const metrics = metricsFromAgg({
      spend,
      impressions,
      clicks,
      reach: agg.reach,
      conversions,
      messages: agg.messages,
      roasSum: agg.roasSum,
      roasN: agg.roasN
    });
    return {
      id,
      name: agg.name ?? id,
      status: "ACTIVE",
      dailyBudget: null,
      spend,
      conversions,
      cpa: conversions > 0 ? spend / conversions : null,
      roas: metrics.roas ?? 0,
      reach: agg.reach,
      clicks,
      ctr: metrics.ctr ?? 0,
      metrics
    };
  });
}

export async function loadAdsFromSnapshots(
  metaCampaignId: string,
  period: ParsedPeriod
): Promise<SnapshotAdRow[]> {
  const { adMetricSnapshot: repo } = await repositories();
  const { since, until } = resolveSinceUntil(period);

  const snaps = period.allTime
    ? await repo.find({
        where: { metaCampaignId, metaAdId: Not(IsNull()) },
        order: { day: "ASC" }
      })
    : await repo.find({
        where: { metaCampaignId, metaAdId: Not(IsNull()), day: Between(since, until) },
        order: { day: "ASC" }
      });

  const byAd = new Map<
    string,
    {
      name: string | null;
      adsetId: string;
      adsetName: string | null;
      spend: number;
      impressions: number;
      clicks: number;
      reach: number;
      conversions: number;
      messages: number;
      roasSum: number;
      roasN: number;
    }
  >();

  for (const s of snaps) {
    const id = s.metaAdId!;
    const ex = byAd.get(id) ?? {
      name: s.adName ?? null,
      adsetId: s.metaAdsetId,
      adsetName: s.adsetName ?? null,
      spend: 0,
      impressions: 0,
      clicks: 0,
      reach: 0,
      conversions: 0,
      messages: 0,
      roasSum: 0,
      roasN: 0
    };
    if (s.adName) ex.name = s.adName;
    if (s.adsetName) ex.adsetName = s.adsetName;
    ex.spend += num(s.spend);
    ex.impressions += num(s.impressions);
    ex.clicks += num(s.clicks);
    ex.reach += num(s.reach);
    ex.conversions += num(s.conversions);
    ex.messages += num(s.messages);
    const roas = num(s.roas);
    if (roas > 0) {
      ex.roasSum += roas;
      ex.roasN += 1;
    }
    byAd.set(id, ex);
  }

  return [...byAd.entries()].map(([id, agg]) => {
    const metrics = metricsFromAgg({
      spend: agg.spend,
      impressions: agg.impressions,
      clicks: agg.clicks,
      reach: agg.reach,
      conversions: agg.conversions,
      messages: agg.messages,
      roasSum: agg.roasSum,
      roasN: agg.roasN
    });
    return {
      id,
      name: agg.name ?? id,
      status: "ACTIVE",
      adsetId: agg.adsetId,
      adsetName: agg.adsetName ?? agg.adsetId,
      metrics
    };
  });
}

export async function loadDrilldownCounts(metaCampaignId: string): Promise<{
  adsets: number;
  ads: number;
  creatives: number;
}> {
  const { adMetricSnapshot: repo } = await repositories();

  const adsetSnaps = await repo
    .createQueryBuilder("s")
    .select("DISTINCT s.metaAdsetId", "id")
    .where("s.metaCampaignId = :metaCampaignId", { metaCampaignId })
    .andWhere("s.metaAdId IS NULL")
    .getRawMany<{ id: string }>();

  const adSnaps = await repo
    .createQueryBuilder("s")
    .select("DISTINCT s.metaAdId", "id")
    .where("s.metaCampaignId = :metaCampaignId", { metaCampaignId })
    .andWhere("s.metaAdId IS NOT NULL")
    .getRawMany<{ id: string }>();

  return {
    adsets: adsetSnaps.length,
    ads: adSnaps.length,
    creatives: adSnaps.length
  };
}
