import "server-only";

import type { AdFormat, AdLibraryFetchResult, NormalizedAd } from "@/lib/meta-ad-library/types";
import { isEuMarket, resolveAdCountries } from "@/lib/meta-ad-library/search-keywords";

const GRAPH_BASE = "https://graph.facebook.com/v20.0";

type RawAdArchiveRow = {
  id?: string;
  ad_creative_bodies?: string[];
  ad_creative_link_titles?: string[];
  ad_creative_link_captions?: string[];
  ad_creative_link_descriptions?: string[];
  page_name?: string;
  page_id?: string;
  ad_delivery_start_time?: string;
  ad_snapshot_url?: string;
  media_type?: string;
};

function getAccessToken(): string | undefined {
  return (
    process.env.META_AD_LIBRARY_ACCESS_TOKEN?.trim() ||
    process.env.META_SYSTEM_USER_TOKEN?.trim() ||
    undefined
  );
}

function daysSince(isoDate: string | undefined): number {
  if (!isoDate) return 0;
  const start = new Date(isoDate);
  if (Number.isNaN(start.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000));
}

function detectFormat(row: RawAdArchiveRow): AdFormat {
  const media = (row.media_type ?? "").toUpperCase();
  if (media.includes("VIDEO")) return "video";
  if (media.includes("CAROUSEL")) return "carousel";
  if (media.includes("IMAGE") || media.includes("PHOTO")) return "image";
  return "unknown";
}

function normalizeRow(row: RawAdArchiveRow, competitorName?: string): NormalizedAd | null {
  const id = row.id?.trim();
  if (!id) return null;

  const body = (row.ad_creative_bodies?.[0] ?? row.ad_creative_link_descriptions?.[0] ?? "").trim();
  const headline = (row.ad_creative_link_titles?.[0] ?? "").trim();
  const cta = row.ad_creative_link_captions?.[0]?.trim() || null;
  const pageName = row.page_name?.trim() || competitorName || "Anunciante";
  const libraryUrl =
    row.ad_snapshot_url?.trim() ||
    `https://www.facebook.com/ads/library/?id=${encodeURIComponent(id)}`;

  return {
    id,
    adArchiveId: id,
    body: body || headline || "(sem copy)",
    headline: headline || body.slice(0, 80) || "Anúncio",
    cta,
    format: detectFormat(row),
    pageName,
    pageId: row.page_id ?? null,
    daysRunning: daysSince(row.ad_delivery_start_time),
    libraryUrl,
    competitorName
  };
}

async function fetchArchivePage(url: URL): Promise<{ rows: RawAdArchiveRow[]; error?: string }> {
  const token = getAccessToken();
  if (!token) {
    return { rows: [], error: "META_AD_LIBRARY_ACCESS_TOKEN not configured" };
  }

  url.searchParams.set("access_token", token);
  url.searchParams.set(
    "fields",
    [
      "id",
      "ad_creative_bodies",
      "ad_creative_link_titles",
      "ad_creative_link_captions",
      "ad_creative_link_descriptions",
      "page_name",
      "page_id",
      "ad_delivery_start_time",
      "ad_snapshot_url",
      "media_type"
    ].join(",")
  );

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    const json = (await res.json()) as { data?: RawAdArchiveRow[]; error?: { message?: string } };
    if (!res.ok || json.error) {
      return { rows: [], error: json.error?.message ?? `HTTP ${res.status}` };
    }
    return { rows: json.data ?? [] };
  } catch (err) {
    return { rows: [], error: err instanceof Error ? err.message : "fetch failed" };
  }
}

async function searchByTerms(args: {
  terms: string;
  countries: string[];
  limit: number;
  competitorName?: string;
}): Promise<{ ads: NormalizedAd[]; error?: string }> {
  const url = new URL(`${GRAPH_BASE}/ads_archive`);
  url.searchParams.set("search_terms", args.terms);
  url.searchParams.set("ad_reached_countries", JSON.stringify(args.countries));
  url.searchParams.set("limit", String(Math.min(args.limit, 50)));
  if (isEuMarket(args.countries[0])) {
    url.searchParams.set("ad_type", "ALL");
  } else {
    url.searchParams.set("ad_type", "ALL");
  }

  const { rows, error } = await fetchArchivePage(url);
  const ads = rows
    .map((r) => normalizeRow(r, args.competitorName))
    .filter((a): a is NormalizedAd => a != null);
  return { ads, error };
}

async function searchByPageId(args: {
  pageId: string;
  countries: string[];
  limit: number;
  competitorName?: string;
}): Promise<{ ads: NormalizedAd[]; error?: string }> {
  const url = new URL(`${GRAPH_BASE}/ads_archive`);
  url.searchParams.set("search_page_ids", JSON.stringify([args.pageId]));
  url.searchParams.set("ad_reached_countries", JSON.stringify(args.countries));
  url.searchParams.set("limit", String(Math.min(args.limit, 50)));
  url.searchParams.set("ad_type", "ALL");

  const { rows, error } = await fetchArchivePage(url);
  const ads = rows
    .map((r) => normalizeRow(r, args.competitorName))
    .filter((a): a is NormalizedAd => a != null);
  return { ads, error };
}

export function isMetaAdLibraryConfigured(): boolean {
  return Boolean(getAccessToken());
}

export async function fetchMetaAdLibrary(args: {
  competitors: Array<{ name: string; pageId?: string }>;
  searchTerms: string[];
  marketCountry: string | null | undefined;
  maxAdsPerQuery?: number;
}): Promise<AdLibraryFetchResult> {
  const token = getAccessToken();
  if (!token) {
    return { ads: [], apiConfigured: false, apiError: "META_AD_LIBRARY_ACCESS_TOKEN not configured" };
  }

  const countries = resolveAdCountries(args.marketCountry);
  const limit = args.maxAdsPerQuery ?? 25;
  const seen = new Set<string>();
  const ads: NormalizedAd[] = [];
  let lastError: string | undefined;

  for (const comp of args.competitors) {
    if (!comp.pageId) continue;
    const result = await searchByPageId({
      pageId: comp.pageId,
      countries,
      limit,
      competitorName: comp.name
    });
    if (result.error) lastError = result.error;
    for (const ad of result.ads) {
      if (seen.has(ad.id)) continue;
      seen.add(ad.id);
      ads.push(ad);
    }
  }

  for (const term of args.searchTerms.slice(0, 3)) {
    const result = await searchByTerms({ terms: term, countries, limit });
    if (result.error) lastError = result.error;
    for (const ad of result.ads) {
      if (seen.has(ad.id)) continue;
      seen.add(ad.id);
      ads.push(ad);
    }
  }

  return { ads, apiConfigured: true, apiError: ads.length === 0 ? lastError : undefined };
}

export function resolveCoverageLevel(args: {
  marketCountry: string | null | undefined;
  adsCount: number;
  apiConfigured: boolean;
}): import("@/lib/meta-ad-library/types").MarketCoverageLevel {
  if (!args.apiConfigured) return "partial";
  if (args.adsCount === 0) return "empty";
  if (args.adsCount >= 10) return "full";
  if (isEuMarket(args.marketCountry) && args.adsCount >= 5) return "full";
  return "partial";
}
