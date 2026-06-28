import "server-only";

import {
  fetchMetaAdLibrary as fetchMetaAdLibraryFromGraph,
  isMetaAdLibraryConfigured as isGraphMetaAdLibraryConfigured
} from "@/lib/meta-ad-library/official-graph-provider";
import {
  fetchMetaAdLibraryViaSearchApi,
  isSearchApiMetaAdLibraryConfigured
} from "@/lib/meta-ad-library/searchapi-provider";
import type { AdLibraryFetchResult } from "@/lib/meta-ad-library/types";

export type MetaAdLibraryProvider = "searchapi" | "graph";

export function resolveMetaAdLibraryProvider(): MetaAdLibraryProvider | null {
  if (isSearchApiMetaAdLibraryConfigured()) return "searchapi";
  if (isGraphMetaAdLibraryConfigured()) return "graph";
  return null;
}

/** True when SearchAPI or Meta Graph Ad Library token is configured. */
export function isMetaAdLibraryConfigured(): boolean {
  return resolveMetaAdLibraryProvider() != null;
}

/**
 * Fetches ads from Meta Ad Library.
 * Prefers SearchAPI (`SEARCHAPI_API_KEY`); falls back to Meta Graph (`META_AD_LIBRARY_ACCESS_TOKEN`).
 */
export async function fetchMetaAdLibrary(args: {
  competitors: Array<{ name: string; pageId?: string }>;
  searchTerms: string[];
  marketCountry: string | null | undefined;
  maxAdsPerQuery?: number;
}): Promise<AdLibraryFetchResult> {
  const provider = resolveMetaAdLibraryProvider();
  if (provider === "searchapi") {
    return fetchMetaAdLibraryViaSearchApi(args);
  }
  if (provider === "graph") {
    return fetchMetaAdLibraryFromGraph(args);
  }
  return {
    ads: [],
    apiConfigured: false,
    apiError: "SEARCHAPI_API_KEY or META_AD_LIBRARY_ACCESS_TOKEN not configured"
  };
}
