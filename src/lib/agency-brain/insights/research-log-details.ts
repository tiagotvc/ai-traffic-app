import type {
  ResearchLogDetails,
  ResearchLogTextItem
} from "@/lib/agency-brain/insights/types";

type MarketApiItem = {
  title: string;
  body: string;
  source: string;
  evidence?: {
    hook?: string;
    competitorName?: string;
    avgDaysRunning?: number;
    dominantCta?: string;
    format?: string;
    libraryUrl?: string;
    adsAnalyzed?: number;
  };
};

type LearningApiItem = {
  title?: string;
  description?: string;
  tags?: string[];
};

function deriveSearchTerms(niche: string | null | undefined): string[] {
  if (!niche?.trim()) return ["e-commerce", "moda fitness", "suplementos"];
  const base = niche.trim();
  return [base, `${base} promo`, `${base} desconto`, `${base} frete grátis`];
}

export function buildScanLogDetails(scanJson: Record<string, unknown>): ResearchLogDetails {
  const items = (scanJson.items ?? []) as MarketApiItem[];
  const niche = (scanJson.niche as string | null) ?? null;

  const hookItems = items.filter(
    (i) => i.source === "META_AD_LIBRARY" && i.evidence?.hook
  );

  const adSamples = hookItems.slice(0, 5).map((i) => ({
    advertiser: i.evidence!.competitorName ?? "Concorrente",
    hook: i.evidence!.hook!,
    format: i.evidence!.format,
    cta: i.evidence!.dominantCta,
    daysRunning: i.evidence!.avgDaysRunning,
    libraryUrl: i.evidence!.libraryUrl
  }));

  const topHooks = hookItems.map((i) => ({
    hook: i.evidence!.hook!,
    count: i.evidence!.adsAnalyzed ?? 1,
    avgDays: i.evidence!.avgDaysRunning
  }));

  const topCtas = items
    .filter((i) => i.title === "CTA dominante" && i.evidence?.dominantCta)
    .map((i) => ({
      cta: i.evidence!.dominantCta!,
      count: i.evidence!.adsAnalyzed ?? 0
    }));

  const compMap = new Map<string, number>();
  for (const ad of adSamples) {
    compMap.set(ad.advertiser, (compMap.get(ad.advertiser) ?? 0) + 1);
  }
  const competitors = [...compMap.entries()].map(([name, adsFound]) => ({ name, adsFound }));

  return {
    niche: niche ?? undefined,
    marketCountry: "BR",
    searchTerms: deriveSearchTerms(niche),
    competitors,
    adSamples,
    topHooks,
    topCtas
  };
}

export function buildPatternLogDetails(detectJson: Record<string, unknown>): ResearchLogDetails {
  const suggestions = (detectJson.suggestions ?? []) as LearningApiItem[];
  return {
    dateRange: "últimos 7 dias",
    campaignPatterns: suggestions.map((s) => ({
      label: s.title ?? "Padrão detectado",
      detail: s.description ?? ""
    })),
    campaignsAnalyzed: [
      ...new Set(
        suggestions.flatMap((s) => s.tags ?? []).filter((t) => t.length > 0)
      )
    ].slice(0, 8)
  };
}

export function buildAiLogDetails(aiJson: Record<string, unknown>): ResearchLogDetails {
  const raw = (aiJson.suggestions ?? aiJson.items ?? []) as LearningApiItem[];
  const aiSuggestions: ResearchLogTextItem[] = raw.map((i) => ({
    title: i.title ?? "Aprendizado sugerido",
    body: i.description
  }));
  return {
    dateRange: "últimos 30 dias",
    aiSuggestions
  };
}

export function buildSynthLogDetails(synthJson: Record<string, unknown>): ResearchLogDetails {
  const items = (synthJson.items ?? []) as MarketApiItem[];
  return {
    synthesisItems: items
      .filter((i) => i.source === "META_AI_SYNTHESIS")
      .map((i) => ({ title: i.title, body: i.body }))
  };
}

export function mergeLogDetails(...parts: (ResearchLogDetails | undefined)[]): ResearchLogDetails {
  return Object.assign({}, ...parts.filter(Boolean));
}
