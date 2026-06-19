export type ClientCompetitor = {
  name: string;
  pageId?: string;
  pageUrl?: string;
};

export type AdFormat = "video" | "image" | "carousel" | "unknown";

export type NormalizedAd = {
  id: string;
  body: string;
  headline: string;
  cta: string | null;
  format: AdFormat;
  pageName: string;
  pageId: string | null;
  daysRunning: number;
  libraryUrl: string;
  adArchiveId: string;
  competitorName?: string;
};

export type MarketCoverageLevel = "full" | "partial" | "empty";

export type AdLibraryFetchResult = {
  ads: NormalizedAd[];
  apiConfigured: boolean;
  apiError?: string;
};

export type MarketScanStats = {
  adsAnalyzed: number;
  competitorsScanned: number;
  hooks: Record<string, number>;
  ctas: Record<string, number>;
  formats: Record<string, number>;
};
