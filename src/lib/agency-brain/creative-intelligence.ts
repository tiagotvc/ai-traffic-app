import type { AdInsightMetrics, AdUsageRow, CreativeAssetType } from "@/lib/meta-graph";
import type { MetricKey } from "@/lib/dashboard-metrics";
import { bestEligible, compareByRank, meetsMinActivity, rankSpecFor, type RankConfig } from "@/lib/creative-ranking";
import { computeConfidenceScore } from "@/lib/agency-brain/confidence-score";
import type { CampaignSignal } from "@/lib/agency-brain/campaign-signal-analyzer";
import type { CampaignMetricsRow } from "@/lib/agency-brain/types";

export type CreativeSums = {
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  conversions: number;
  messages: number;
  roasSum: number;
  roasCount: number;
};

export function newCreativeSums(): CreativeSums {
  return { spend: 0, impressions: 0, clicks: 0, reach: 0, conversions: 0, messages: 0, roasSum: 0, roasCount: 0 };
}

export function addInsightToSums(s: CreativeSums, m: AdInsightMetrics) {
  s.spend += m.spend;
  s.impressions += m.impressions;
  s.clicks += m.clicks;
  s.reach += m.reach;
  s.conversions += m.conversions;
  s.messages += m.messages;
  if (m.roas > 0) {
    s.roasSum += m.roas;
    s.roasCount += 1;
  }
}

export function metricsFromSums(s: CreativeSums): Partial<Record<MetricKey, number>> {
  return {
    spend: s.spend,
    impressions: s.impressions,
    clicks: s.clicks,
    reach: s.reach,
    conversions: s.conversions,
    messages: s.messages,
    ctr: s.impressions > 0 ? (s.clicks / s.impressions) * 100 : 0,
    cpc: s.clicks > 0 ? s.spend / s.clicks : 0,
    cpm: s.impressions > 0 ? (s.spend / s.impressions) * 1000 : 0,
    cpa: s.conversions > 0 ? s.spend / s.conversions : 0,
    cpmsg: s.messages > 0 ? s.spend / s.messages : 0,
    frequency: s.reach > 0 ? s.impressions / s.reach : 0,
    roas: s.roasCount ? s.roasSum / s.roasCount : 0
  };
}

type CampBreak = { id: string; name: string; sums: CreativeSums; ads: Set<string> };
type AdsetBreak = { id: string; name: string; campaignName: string; sums: CreativeSums; ads: Set<string> };

export type CreativeAgg = {
  name: string;
  type: CreativeAssetType;
  thumbnailUrl?: string;
  imageUrl?: string;
  firstAdId?: string;
  creativeId?: string;
  sums: CreativeSums;
  ads: Set<string>;
  campaigns: Map<string, string>;
  adsets: Map<string, string>;
  campaignIds: string[];
  anyActive: boolean;
  perCampaign: Map<string, CampBreak>;
  perAdset: Map<string, AdsetBreak>;
};

export type AggregatedCreative = {
  key: string;
  name: string;
  type: CreativeAssetType;
  adId: string | null;
  adIds: string[];
  creativeId: string | null;
  thumbnailUrl: string | null;
  imageUrl: string | null;
  status: "ACTIVE" | "PAUSED";
  adsCount: number;
  clientSlug: string;
  dominantPreset: string;
  metrics: Partial<Record<MetricKey, number>>;
  campaigns: Array<{ id: string; name: string }>;
  adsets: Array<{ id: string; name: string }>;
  breakdown: Array<{
    campaignId: string;
    campaignName: string;
    adsCount: number;
    metrics: Partial<Record<MetricKey, number>>;
  }>;
  breakdownAdsets: Array<{
    adsetId: string;
    adsetName: string;
    campaignName: string;
    adsCount: number;
    metrics: Partial<Record<MetricKey, number>>;
  }>;
};

export function aggregateCreativesFromAccountData(input: {
  ads: AdUsageRow[];
  insights: Map<string, AdInsightMetrics>;
  clientSlug: string;
  presetByCampaign: Map<string, string>;
  into?: Map<string, CreativeAgg>;
}): Map<string, CreativeAgg> {
  const byCreative = input.into ?? new Map<string, CreativeAgg>();

  for (const ad of input.ads) {
    if (ad.campaignStatus !== "ACTIVE") continue;

    const key =
      ad.mediaKey ??
      (ad.creativeId ? `c:${ad.creativeId}` : ad.creativeName ? `n:${ad.creativeName.trim()}` : ad.id);

    let agg = byCreative.get(key);
    if (!agg) {
      agg = {
        name: ad.creativeName?.trim() || ad.name?.trim() || key,
        type: ad.creativeType ?? "image",
        thumbnailUrl: ad.thumbnailUrl,
        imageUrl: ad.imageUrl,
        sums: newCreativeSums(),
        ads: new Set(),
        campaigns: new Map(),
        adsets: new Map(),
        campaignIds: [],
        anyActive: false,
        perCampaign: new Map(),
        perAdset: new Map()
      };
      byCreative.set(key, agg);
    }
    if (!agg.thumbnailUrl && ad.thumbnailUrl) agg.thumbnailUrl = ad.thumbnailUrl;
    if (ad.imageUrl && (!agg.imageUrl || ad.imageUrl.length > (agg.imageUrl?.length ?? 0))) {
      agg.imageUrl = ad.imageUrl;
    }
    if (!agg.firstAdId || ad.status === "ACTIVE") agg.firstAdId = ad.id;
    if (!agg.creativeId && ad.creativeId) agg.creativeId = ad.creativeId;
    agg.ads.add(ad.id);
    if (ad.campaignId) {
      agg.campaigns.set(ad.campaignId, ad.campaignName ?? ad.campaignId);
      agg.campaignIds.push(ad.campaignId);
    }
    if (ad.adsetId) agg.adsets.set(ad.adsetId, ad.adsetName ?? ad.adsetId);
    if (ad.status === "ACTIVE") agg.anyActive = true;

    const m = input.insights.get(ad.id);
    if (m) {
      addInsightToSums(agg.sums, m);
      if (ad.campaignId) {
        let cb = agg.perCampaign.get(ad.campaignId);
        if (!cb) {
          cb = { id: ad.campaignId, name: ad.campaignName ?? ad.campaignId, sums: newCreativeSums(), ads: new Set() };
          agg.perCampaign.set(ad.campaignId, cb);
        }
        addInsightToSums(cb.sums, m);
        cb.ads.add(ad.id);
      }
      if (ad.adsetId) {
        let ab = agg.perAdset.get(ad.adsetId);
        if (!ab) {
          ab = {
            id: ad.adsetId,
            name: ad.adsetName ?? ad.adsetId,
            campaignName: ad.campaignName ?? "",
            sums: newCreativeSums(),
            ads: new Set()
          };
          agg.perAdset.set(ad.adsetId, ab);
        }
        addInsightToSums(ab.sums, m);
        ab.ads.add(ad.id);
      }
    }
  }

  return byCreative;
}

export function mapAggregatesToCreatives(
  byCreative: Map<string, CreativeAgg>,
  clientSlug: string,
  presetByCampaign: Map<string, string>
): AggregatedCreative[] {
  return [...byCreative.values()].map((a) => {
    const counts = new Map<string, number>();
    for (const cid of a.campaignIds) {
      const p = presetByCampaign.get(cid) ?? "default";
      counts.set(p, (counts.get(p) ?? 0) + 1);
    }
    let dominantPreset = "default";
    let best = -1;
    for (const [p, n] of counts) {
      if (n > best) {
        dominantPreset = p;
        best = n;
      }
    }

    const breakdown = [...a.perCampaign.values()]
      .map((cb) => ({
        campaignId: cb.id,
        campaignName: cb.name,
        adsCount: cb.ads.size,
        metrics: metricsFromSums(cb.sums)
      }))
      .sort((x, y) => Number(y.metrics.spend ?? 0) - Number(x.metrics.spend ?? 0));

    const breakdownAdsets = [...a.perAdset.values()]
      .map((ab) => ({
        adsetId: ab.id,
        adsetName: ab.name,
        campaignName: ab.campaignName,
        adsCount: ab.ads.size,
        metrics: metricsFromSums(ab.sums)
      }))
      .sort((x, y) => Number(y.metrics.spend ?? 0) - Number(x.metrics.spend ?? 0));

    return {
      key: a.name,
      name: a.name,
      type: a.type,
      adId: a.firstAdId ?? null,
      adIds: [...a.ads],
      creativeId: a.creativeId ?? null,
      thumbnailUrl: a.thumbnailUrl ?? null,
      imageUrl: a.imageUrl ?? a.thumbnailUrl ?? null,
      status: a.anyActive ? "ACTIVE" : "PAUSED",
      adsCount: a.ads.size,
      clientSlug,
      dominantPreset,
      metrics: metricsFromSums(a.sums),
      campaigns: [...a.campaigns.entries()].map(([id, name]) => ({ id, name })),
      adsets: [...a.adsets.entries()].map(([id, name]) => ({ id, name })),
      breakdown,
      breakdownAdsets
    };
  });
}

export function getTopCreativesByPreset(
  creatives: AggregatedCreative[],
  rankConfig: RankConfig
) {
  const byPreset = new Map<string, AggregatedCreative[]>();
  for (const c of creatives) {
    const arr = byPreset.get(c.dominantPreset) ?? [];
    arr.push(c);
    byPreset.set(c.dominantPreset, arr);
  }

  return [...byPreset.entries()]
    .map(([preset, list]) => {
      const spec = rankSpecFor(preset, rankConfig);
      const byEff = (a: AggregatedCreative, b: AggregatedCreative) =>
        compareByRank(a.metrics, b.metrics, spec);
      const spentList = list.filter((c) => Number(c.metrics.spend ?? 0) > 0);
      const noSpend = list
        .filter((c) => Number(c.metrics.spend ?? 0) <= 0)
        .sort((a, b) => Number(b.metrics.impressions ?? 0) - Number(a.metrics.impressions ?? 0));
      const isBest = (c: AggregatedCreative) =>
        meetsMinActivity(c.metrics, rankConfig) && bestEligible(c.metrics, preset);
      const best = spentList.filter(isBest).sort(byEff);
      const promising = spentList.filter((c) => !isBest(c)).sort(byEff);
      const totalSpend = list.reduce((s, c) => s + Number(c.metrics.spend ?? 0), 0);
      return { preset, primaryMetric: spec.metric, totalSpend, best, promising, noSpend };
    })
    .filter((g) => g.best.length || g.promising.length || g.noSpend.length)
    .sort((a, b) => b.totalSpend - a.totalSpend);
}

export type CreativeTier = "best" | "promising" | "no_spend";

export type RankedCreative = AggregatedCreative & {
  tier: CreativeTier;
  primaryMetric: MetricKey;
};

export function rankedCreativesFromGroups(
  groups: ReturnType<typeof getTopCreativesByPreset>
): RankedCreative[] {
  const out: RankedCreative[] = [];
  for (const g of groups) {
    for (const c of g.best) out.push({ ...c, tier: "best", primaryMetric: g.primaryMetric });
    for (const c of g.promising)
      out.push({ ...c, tier: "promising", primaryMetric: g.primaryMetric });
    for (const c of g.noSpend) out.push({ ...c, tier: "no_spend", primaryMetric: g.primaryMetric });
  }
  return out;
}

/** Converte criativos ranqueados em sinais de campanha (dados reais do ranking). */
export function creativesToSignals(
  ranked: RankedCreative[],
  current: CampaignMetricsRow[],
  windowDays: number
): CampaignSignal[] {
  const byCampaign = new Map(current.map((c) => [c.metaCampaignId, c]));
  const signals: CampaignSignal[] = [];

  for (const creative of ranked) {
    if (creative.tier === "no_spend") continue;
    const campaignId = creative.campaigns[0]?.id;
    if (!campaignId) continue;
    const campaign = byCampaign.get(campaignId);
    if (!campaign) continue;

    const spend = Number(creative.metrics.spend ?? 0);
    const ctr = Number(creative.metrics.ctr ?? 0);
    const roas = Number(creative.metrics.roas ?? 0);
    const frequency = Number(creative.metrics.frequency ?? 0);

    const baseline = {
      kind: "campaign30d" as const,
      windowDays,
      cpa: campaign.cpa,
      ctr: campaign.ctr,
      roas: campaign.roas,
      spend: campaign.spend,
      conversions: campaign.conversions
    };

    if (creative.tier === "best") {
      const deltaPercent =
        creative.primaryMetric === "roas" && campaign.roas > 0
          ? ((roas - campaign.roas) / campaign.roas) * 100
          : creative.primaryMetric === "ctr" && campaign.ctr > 0
            ? ((ctr - campaign.ctr) / campaign.ctr) * 100
            : 15;
      const type =
        creative.primaryMetric === "roas"
          ? "roas_lift"
          : creative.primaryMetric === "ctr"
            ? "ctr_strong"
            : "cpa_efficient";
      const tier = spend >= 200 ? "medium" : "weak";
      const confidenceScore = computeConfidenceScore({
        conversions: Number(creative.metrics.conversions ?? 0),
        spend,
        deltaPercent,
        campaignCount: current.length,
        windowDays,
        mode: tier === "weak" ? "hypothesis" : "learning"
      });
      signals.push({
        type,
        tier,
        campaign,
        deltaPercent,
        confidenceScore,
        priorityScore: Math.abs(deltaPercent) + spend / 50 + confidenceScore / 10,
        baseline
      });
    }

    if (frequency >= 3.5 && ctr < 1 && spend >= 100) {
      signals.push({
        type: "saturation",
        tier: "weak",
        campaign,
        deltaPercent: 0,
        confidenceScore: computeConfidenceScore({
          conversions: Number(creative.metrics.conversions ?? 0),
          spend,
          deltaPercent: 0,
          campaignCount: current.length,
          windowDays,
          mode: "hypothesis"
        }),
        priorityScore: frequency * 10,
        baseline
      });
    }
  }

  return signals;
}
