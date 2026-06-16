import type { MetricKey } from "@/lib/dashboard-metrics";
import {
  getTopCreativesByPreset,
  type AggregatedCreative
} from "@/lib/agency-brain/creative-intelligence";
import type { RankConfig } from "@/lib/creative-ranking";

export type CreativeRankGroup = ReturnType<typeof getTopCreativesByPreset>[number];

/** Junta criativos de várias contas e recalcula o ranking global. */
export function mergeCreativesIntoGroups(
  chunks: AggregatedCreative[][],
  rankConfig: RankConfig
): CreativeRankGroup[] {
  const merged = mergeAggregatedCreatives(chunks.flat());
  return getTopCreativesByPreset(merged, rankConfig);
}

function mergeAggregatedCreatives(items: AggregatedCreative[]): AggregatedCreative[] {
  const byKey = new Map<string, AggregatedCreative>();
  for (const c of items) {
    const prev = byKey.get(c.key);
    if (!prev) {
      byKey.set(c.key, {
        ...c,
        campaigns: [...c.campaigns],
        adsets: [...c.adsets],
        breakdown: [...(c.breakdown ?? [])],
        breakdownAdsets: [...(c.breakdownAdsets ?? [])]
      });
      continue;
    }
    byKey.set(c.key, {
      ...prev,
      adsCount: prev.adsCount + c.adsCount,
      status: prev.status === "ACTIVE" || c.status === "ACTIVE" ? "ACTIVE" : "PAUSED",
      thumbnailUrl: prev.thumbnailUrl ?? c.thumbnailUrl,
      imageUrl: prev.imageUrl ?? c.imageUrl,
      adId: prev.adId ?? c.adId,
      metrics: sumMetrics(prev.metrics, c.metrics),
      campaigns: dedupeRefs([...prev.campaigns, ...c.campaigns]),
      adsets: dedupeRefs([...prev.adsets, ...c.adsets]),
      breakdown: [...prev.breakdown, ...(c.breakdown ?? [])],
      breakdownAdsets: [...prev.breakdownAdsets, ...(c.breakdownAdsets ?? [])]
    });
  }
  return [...byKey.values()];
}

function sumMetrics(
  a: Partial<Record<MetricKey, number>>,
  b: Partial<Record<MetricKey, number>>
): Partial<Record<MetricKey, number>> {
  const spend = Number(a.spend ?? 0) + Number(b.spend ?? 0);
  const impressions = Number(a.impressions ?? 0) + Number(b.impressions ?? 0);
  const clicks = Number(a.clicks ?? 0) + Number(b.clicks ?? 0);
  const reach = Number(a.reach ?? 0) + Number(b.reach ?? 0);
  const conversions = Number(a.conversions ?? 0) + Number(b.conversions ?? 0);
  const messages = Number(a.messages ?? 0) + Number(b.messages ?? 0);
  const roasA = Number(a.roas ?? 0);
  const roasB = Number(b.roas ?? 0);
  const roas =
    roasA > 0 && roasB > 0
      ? (roasA + roasB) / 2
      : roasA > 0
        ? roasA
        : roasB;
  return {
    spend,
    impressions,
    clicks,
    reach,
    conversions,
    messages,
    roas,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    cpa: conversions > 0 ? spend / conversions : 0,
    cpmsg: messages > 0 ? spend / messages : 0,
    frequency: reach > 0 ? impressions / reach : 0
  };
}

function dedupeRefs<T extends { id: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of list) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}
