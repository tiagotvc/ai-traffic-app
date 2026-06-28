export type { ClientCompetitor, NormalizedAd, MarketCoverageLevel, MarketScanStats } from "./types";
export {
  fetchMetaAdLibrary,
  isMetaAdLibraryConfigured,
  resolveMetaAdLibraryProvider,
  type MetaAdLibraryProvider
} from "./provider";
export { resolveCoverageLevel } from "./official-graph-provider";
export {
  NICHE_SEARCH_KEYWORDS,
  OBJECTIVE_SEARCH_KEYWORDS,
  resolveSearchTerms,
  resolveObjectiveSearchTerms,
  resolveAdCountries,
  isEuMarket
} from "./search-keywords";
