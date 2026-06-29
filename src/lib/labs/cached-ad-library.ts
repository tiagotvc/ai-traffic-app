import "server-only";

import { fetchMetaAdLibrary } from "@/lib/meta-ad-library/provider";
import type { AdLibraryFetchResult } from "@/lib/meta-ad-library/types";

import {
  canSpendSearchApi,
  getCachedResearch,
  recordSearchApiSpend,
  researchCacheKey,
  setCachedResearch
} from "./market-research-cache";

/**
 * Fetch de anúncios (Meta Ad Library/searchapi) com cache por nicho+país e teto
 * mensal. Usado por QUALQUER tela (cientista, criador de campanha) → a chamada ao
 * searchapi é compartilhada: 1 por nicho serve todos durante o TTL.
 */
export async function fetchAdLibraryCached(args: {
  competitors: Array<{ name: string; pageId?: string }>;
  searchTerms: string[];
  marketCountry: string | null | undefined;
  maxAdsPerQuery?: number;
  /** Chave de cache: nicho do cliente ou termos da busca. */
  cacheNiche: string;
}): Promise<AdLibraryFetchResult & { fromCache?: boolean; budgetExhausted?: boolean }> {
  const key = researchCacheKey("adlib", args.cacheNiche || args.searchTerms.join("-"), args.marketCountry);

  const cached = await getCachedResearch<AdLibraryFetchResult>(key);
  if (cached) return { ...cached, fromCache: true };

  if (!(await canSpendSearchApi())) {
    return { ads: [], apiConfigured: true, apiError: "searchapi_budget_exhausted", budgetExhausted: true };
  }

  const res = await fetchMetaAdLibrary({
    competitors: args.competitors,
    searchTerms: args.searchTerms,
    marketCountry: args.marketCountry,
    maxAdsPerQuery: args.maxAdsPerQuery
  });
  await recordSearchApiSpend();

  // Só cacheia resultado útil (evita gravar erro transitório).
  if (res.ads.length) await setCachedResearch(key, res);
  return res;
}
