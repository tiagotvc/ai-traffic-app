import "server-only";

import { extractMarketPatterns } from "@/lib/agency-brain/market-pattern-extractor";
import { fetchMetaAdLibrary, isMetaAdLibraryConfigured } from "@/lib/meta-ad-library/provider";
import { resolveSearchTerms } from "@/lib/meta-ad-library/search-keywords";

import type { ScientistSkill, ScientistSkillResult } from "./types";

/**
 * Marketing Scientist (id `competitor`) — pesquisa concorrentes na Meta Ad Library
 * (via a integração do PRÓPRIO app: SearchAPI/`SEARCHAPI_API_KEY` ou Graph) e extrai
 * padrões (hooks, ofertas, criativos). Read-only.
 */
export const competitorSkill: ScientistSkill = {
  id: "competitor",
  flagId: "scientists.competitor",
  canRun: (input) => Boolean(input.niche?.trim() || (input.competitors && input.competitors.length)),
  run: async (input): Promise<ScientistSkillResult> => {
    if (!isMetaAdLibraryConfigured()) {
      return {
        scientistId: "competitor",
        ran: false,
        reason: "ad_library_not_configured",
        findings: [],
        sources: []
      };
    }

    const searchTerms = resolveSearchTerms(input.niche).slice(0, 4);
    const result = await fetchMetaAdLibrary({
      competitors: input.competitors ?? [],
      searchTerms,
      marketCountry: input.marketCountry ?? "BR",
      maxAdsPerQuery: 25
    });

    const patterns = extractMarketPatterns(result.ads, input.niche ?? null);
    return {
      scientistId: "competitor",
      ran: result.ads.length > 0,
      reason: result.ads.length ? undefined : result.apiError ?? "no_ads_found",
      itemsAnalyzed: result.ads.length,
      findings: patterns.map((p) => ({
        type: "competitor_pattern",
        title: p.title,
        body: p.body,
        evidence: p.evidence as Record<string, unknown> | undefined
      })),
      sources: ["meta_ad_library"]
    };
  }
};
