import type { PeriodState } from "@/components/PeriodFilter";
import { periodStateToQuery } from "@/components/PeriodFilter";
import type { MetricKey } from "@/lib/dashboard-metrics";

const STORAGE_PREFIX = "traffic-ai-drilldown:";
const TTL_MS = Number(process.env.NEXT_PUBLIC_META_INSIGHTS_CACHE_TTL_SEC ?? "180") * 1000 || 180_000;

export type DrilldownCampaign = {
  id: string;
  name: string;
  status: string;
  dailyBudget: number | null;
  clientSlug: string;
  clientName: string;
  accountLabel: string;
  metaAdAccountId: string;
  objective: string;
  kpis?: Partial<Record<MetricKey, number | null>> & {
    spend: number;
    conversions: number;
    cpa: number | null;
    roas: number;
  };
};

export type DrilldownAdsetRow = {
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

export type DrilldownAdRow = {
  id: string;
  name?: string;
  status?: string;
  adsetId: string;
  adsetName?: string;
  metrics?: Partial<Record<MetricKey, number>> | null;
};

export type DrilldownCreativeRow = {
  title: string;
  type?: string;
  status: string;
  adId?: string | null;
  usageAds?: number;
  thumbnailUrl?: string | null;
  imageUrl?: string | null;
  metrics?: Partial<Record<MetricKey, number>>;
};

export type DrilldownSeriesPoint = {
  day: string;
  spend: number;
  impressions?: number;
  reach?: number;
  frequency?: number;
  clicks?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
  conversions: number;
  cpa?: number | null;
  messages?: number;
  cpmsg?: number;
  roas?: number;
};

export type DrilldownCounts = {
  adsets: number;
  ads: number;
  creatives: number;
};

export type DrilldownCacheEntry = {
  campaign: DrilldownCampaign | null;
  adsets: DrilldownAdsetRow[];
  ads: DrilldownAdRow[];
  creatives: DrilldownCreativeRow[];
  creativesPreset: string;
  creativesPrimaryMetric: string;
  series: DrilldownSeriesPoint[];
  previous: Partial<Record<MetricKey, number>> | null;
  preset: string;
  counts: DrilldownCounts;
  fetchedAt: number;
  live: boolean;
};

export function drilldownCacheKey(
  metaCampaignId: string,
  clientSlug: string,
  period: PeriodState
): string {
  const periodQs = periodStateToQuery(period).toString();
  return `${metaCampaignId}:${clientSlug || "_"}:${periodQs}`;
}

function storageKey(key: string) {
  return `${STORAGE_PREFIX}${key}`;
}

export function readDrilldownCache(key: string): DrilldownCacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(key));
    if (!raw) return null;
    const entry = JSON.parse(raw) as DrilldownCacheEntry;
    if (!entry?.fetchedAt || Date.now() - entry.fetchedAt > TTL_MS) {
      sessionStorage.removeItem(storageKey(key));
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

export function writeDrilldownCache(key: string, entry: DrilldownCacheEntry) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(key), JSON.stringify(entry));
  } catch {
    /* quota */
  }
}

export function clearDrilldownCache(key?: string) {
  if (typeof window === "undefined") return;
  if (key) {
    sessionStorage.removeItem(storageKey(key));
    return;
  }
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const k = sessionStorage.key(i);
    if (k?.startsWith(STORAGE_PREFIX)) sessionStorage.removeItem(k);
  }
}

export function isDrilldownCacheValid(entry: DrilldownCacheEntry | null): entry is DrilldownCacheEntry {
  return !!entry && Date.now() - entry.fetchedAt <= TTL_MS;
}

export function shouldUseLiveFetch(period: PeriodState, forceLive?: boolean): boolean {
  if (forceLive) return true;
  return period.preset === "today";
}
