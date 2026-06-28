import "server-only";

import { resolveAdCountries } from "@/lib/meta-ad-library/search-keywords";
import type { AdLibraryFetchResult, AdFormat, NormalizedAd } from "@/lib/meta-ad-library/types";

const SEARCHAPI_BASE = "https://www.searchapi.io/api/v1/search";

type SearchApiAdRow = {
  ad_archive_id?: string;
  page_id?: string;
  page_name?: string;
  start_date?: string;
  snapshot?: {
    page_name?: string;
    page_id?: string;
    body?: { text?: string };
    title?: string;
    cta_text?: string;
    display_format?: string;
  };
};

type SearchApiResponse = {
  ads?: SearchApiAdRow[];
  error?: string;
  search_metadata?: { status?: string };
};

function getSearchApiKey(): string | undefined {
  return process.env.SEARCHAPI_API_KEY?.trim() || undefined;
}

export function isSearchApiMetaAdLibraryConfigured(): boolean {
  return Boolean(getSearchApiKey());
}

function daysSince(isoDate: string | undefined): number {
  if (!isoDate) return 0;
  const start = new Date(isoDate);
  if (Number.isNaN(start.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000));
}

function detectFormat(row: SearchApiAdRow): AdFormat {
  const media = (row.snapshot?.display_format ?? "").toUpperCase();
  if (media.includes("VIDEO")) return "video";
  if (media.includes("CAROUSEL")) return "carousel";
  if (media.includes("IMAGE") || media.includes("MULTI_IMAGES") || media.includes("PHOTO")) {
    return "image";
  }
  return "unknown";
}

function normalizeRow(row: SearchApiAdRow, competitorName?: string): NormalizedAd | null {
  const id = row.ad_archive_id?.trim();
  if (!id) return null;

  const body = (row.snapshot?.body?.text ?? "").trim();
  const headline = (row.snapshot?.title ?? "").trim();
  const cta = row.snapshot?.cta_text?.trim() || null;
  const pageName = row.page_name?.trim() || row.snapshot?.page_name?.trim() || competitorName || "Anunciante";

  return {
    id,
    adArchiveId: id,
    body: body || headline || "(sem copy)",
    headline: headline || body.slice(0, 80) || "Anúncio",
    cta,
    format: detectFormat(row),
    pageName,
    pageId: row.page_id ?? row.snapshot?.page_id ?? null,
    daysRunning: daysSince(row.start_date),
    libraryUrl: `https://www.facebook.com/ads/library/?id=${encodeURIComponent(id)}`,
    competitorName
  };
}

function resolveSearchApiCountry(marketCountry: string | null | undefined): string {
  const countries = resolveAdCountries(marketCountry);
  return countries[0]?.toUpperCase() ?? "BR";
}

async function searchSearchApi(params: Record<string, string>): Promise<{ ads: NormalizedAd[]; error?: string }> {
  const apiKey = getSearchApiKey();
  if (!apiKey) {
    return { ads: [], error: "SEARCHAPI_API_KEY not configured" };
  }

  const url = new URL(SEARCHAPI_BASE);
  url.searchParams.set("engine", "meta_ad_library");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  try {
    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const json = (await res.json()) as SearchApiResponse;
    if (!res.ok) {
      return { ads: [], error: json.error ?? `HTTP ${res.status}` };
    }
    if (json.search_metadata?.status === "Error") {
      return { ads: [], error: json.error ?? "SearchAPI error" };
    }

    const ads = (json.ads ?? [])
      .map((row) => normalizeRow(row))
      .filter((ad): ad is NormalizedAd => ad != null);
    return { ads, error: ads.length === 0 ? json.error : undefined };
  } catch (err) {
    return { ads: [], error: err instanceof Error ? err.message : "fetch failed" };
  }
}

async function searchByPageId(args: {
  pageId: string;
  country: string;
  competitorName?: string;
}): Promise<{ ads: NormalizedAd[]; error?: string }> {
  const result = await searchSearchApi({
    page_id: args.pageId,
    country: args.country,
    ad_type: "all",
    active_status: "active"
  });

  const ads = result.ads.map((ad) =>
    args.competitorName ? { ...ad, competitorName: args.competitorName } : ad
  );
  return { ads, error: result.error };
}

async function searchByTerms(args: {
  terms: string;
  country: string;
}): Promise<{ ads: NormalizedAd[]; error?: string }> {
  return searchSearchApi({
    q: args.terms,
    country: args.country,
    ad_type: "all",
    active_status: "active"
  });
}

/**
 * Meta Ad Library via SearchAPI (`engine=meta_ad_library`).
 * @see https://www.searchapi.io/docs/meta-ad-library-api
 */
export async function fetchMetaAdLibraryViaSearchApi(args: {
  competitors: Array<{ name: string; pageId?: string }>;
  searchTerms: string[];
  marketCountry: string | null | undefined;
  maxAdsPerQuery?: number;
}): Promise<AdLibraryFetchResult> {
  const apiKey = getSearchApiKey();
  if (!apiKey) {
    return { ads: [], apiConfigured: false, apiError: "SEARCHAPI_API_KEY not configured" };
  }

  const country = resolveSearchApiCountry(args.marketCountry);
  const limit = args.maxAdsPerQuery ?? 25;
  const seen = new Set<string>();
  const ads: NormalizedAd[] = [];
  let lastError: string | undefined;

  for (const comp of args.competitors) {
    if (!comp.pageId) continue;
    const result = await searchByPageId({
      pageId: comp.pageId,
      country,
      competitorName: comp.name
    });
    if (result.error) lastError = result.error;
    for (const ad of result.ads) {
      if (seen.has(ad.id)) continue;
      seen.add(ad.id);
      ads.push(ad);
      if (ads.length >= limit * 3) break;
    }
  }

  for (const term of args.searchTerms.slice(0, 3)) {
    const result = await searchByTerms({ terms: term, country });
    if (result.error) lastError = result.error;
    for (const ad of result.ads) {
      if (seen.has(ad.id)) continue;
      seen.add(ad.id);
      ads.push(ad);
      if (ads.length >= limit * 3) break;
    }
  }

  return { ads, apiConfigured: true, apiError: ads.length === 0 ? lastError : undefined };
}
