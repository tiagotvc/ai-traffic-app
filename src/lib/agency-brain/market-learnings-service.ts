import "server-only";

import { createHash } from "crypto";
import { z } from "zod";

import { getNicheStarterInsights } from "@/lib/agency-brain/niche-insights";
import type { MarketMemory } from "@/db/entities/MarketMemory";
import { getGeminiApiKey } from "@/lib/creative-memory/ai-usage";
import { classifyGeminiError, geminiGenerateJson, type GeminiGenerateMeta } from "@/lib/gemini";
import type { MarketCoverageLevel } from "@/lib/meta-ad-library/types";
import { isMetaAdLibraryConfigured } from "@/lib/meta-ad-library";

export type MarketInsightSource =
  | "NICHE_STATIC"
  | "NICHE_AGGREGATED"
  | "META_AD_LIBRARY"
  | "META_AI_SYNTHESIS";

export type MarketInsightEvidence = {
  adsAnalyzed?: number;
  competitorName?: string;
  avgDaysRunning?: number;
  hook?: string;
  dominantCta?: string;
  format?: string;
  saturationPct?: number;
  libraryUrl?: string;
  sampleLibraryUrls?: string[];
};

export type MarketInsightDto = {
  id: string;
  title: string;
  body: string;
  source: MarketInsightSource;
  niche: string | null;
  evidence?: MarketInsightEvidence;
};

const AiMarketSchema = z.object({
  insights: z.array(
    z.object({
      title: z.string().min(1).max(200),
      body: z.string().min(1).max(800)
    })
  )
});

function insightId(source: MarketInsightSource, title: string, index: number): string {
  const hash = createHash("sha1").update(`${source}:${title}`).digest("hex").slice(0, 10);
  return `${source.toLowerCase().replace(/_/g, "-")}-${index}-${hash}`;
}

export async function getMarketInsights(niche: string | null | undefined): Promise<{
  niche: string | null;
  items: MarketInsightDto[];
  aggregated: boolean;
}> {
  const { niche: nicheKey, patterns, aggregated } = await getNicheStarterInsights(niche);

  const items: MarketInsightDto[] = patterns.map((pattern, index) => {
    const isAggregated = pattern.startsWith("Outras agências reportam:");
    const source: MarketInsightSource = isAggregated ? "NICHE_AGGREGATED" : "NICHE_STATIC";
    const title = isAggregated ? "Padrão do nicho (rede)" : "Padrão de mercado";
    return {
      id: insightId(source, pattern, index),
      title,
      body: pattern,
      source,
      niche: nicheKey
    };
  });

  return { niche: nicheKey, items, aggregated };
}

export function mergeMarketItems(
  memoryPatterns: MarketInsightDto[],
  nicheItems: MarketInsightDto[]
): MarketInsightDto[] {
  const ids = new Set(memoryPatterns.map((i) => i.id));
  return [...memoryPatterns, ...nicheItems.filter((i) => !ids.has(i.id))];
}

export function buildMarketResponse(args: {
  clientName: string;
  niche: string | null;
  memory: MarketMemory | null;
  memoryPatterns: MarketInsightDto[];
  nicheBundle: Awaited<ReturnType<typeof getMarketInsights>>;
}): {
  clientName: string;
  niche: string | null;
  items: MarketInsightDto[];
  aggregated: boolean;
  coverageLevel: MarketCoverageLevel;
  adsAnalyzed: number;
  competitorsScanned: number;
  scannedAt: string | null;
  expiresAt: string | null;
  hasScan: boolean;
  apiConfigured: boolean;
} {
  const items = mergeMarketItems(args.memoryPatterns, args.nicheBundle.items);

  return {
    clientName: args.clientName,
    niche: args.niche ?? args.nicheBundle.niche,
    items,
    aggregated: args.nicheBundle.aggregated,
    coverageLevel: args.memory?.coverageLevel ?? "empty",
    adsAnalyzed: args.memory?.adsAnalyzed ?? 0,
    competitorsScanned: args.memory?.competitorsScanned ?? 0,
    scannedAt: args.memory?.fetchedAt?.toISOString() ?? null,
    expiresAt: args.memory?.expiresAt?.toISOString() ?? null,
    hasScan: Boolean(args.memory && args.memoryPatterns.length > 0),
    apiConfigured: isMetaAdLibraryConfigured()
  };
}

export async function synthesizeMarketFromMemory(args: {
  niche: string;
  clientName: string;
  patterns: MarketInsightDto[];
  modelChain?: string[];
}): Promise<{ items: MarketInsightDto[]; error?: string; modelMeta?: GeminiGenerateMeta }> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return { items: [], error: "GEMINI_API_KEY missing" };

  if (args.patterns.length === 0) {
    return { items: [], error: "Execute o scan da Biblioteca Meta antes de sintetizar" };
  }

  const patternSummary = args.patterns
    .filter((p) => p.source === "META_AD_LIBRARY")
    .slice(0, 10)
    .map(
      (p) =>
        `- ${p.title}: ${p.body}${p.evidence?.libraryUrl ? ` [${p.evidence.libraryUrl}]` : ""}`
    )
    .join("\n");

  const prompt = [
    "Você é um analista de mercado de performance (Meta Ads) para agências.",
    "Com base EXCLUSIVAMENTE nos padrões reais coletados da Meta Ad Library abaixo,",
    "sugira 2 a 4 oportunidades ou tendências de MERCADO.",
    "NÃO invente anúncios, números ou concorrentes que não estejam nos dados.",
    "Tom: consultivo e objetivo.",
    "",
    `Nicho: ${args.niche}`,
    `Cliente (contexto): ${args.clientName}`,
    "",
    "Padrões reais coletados:",
    patternSummary || "- (nenhum)",
    "",
    'Retorne JSON: { "insights": [ { "title": "...", "body": "..." } ] }'
  ].join("\n");

  try {
    const { data, ...modelMeta } = await geminiGenerateJson({
      prompt,
      apiKey,
      schema: AiMarketSchema,
      temperature: 0.35,
      modelChain: args.modelChain
    });

    const items = data.insights.map((item, index) => ({
      id: insightId("META_AI_SYNTHESIS", item.title, index),
      title: item.title.trim(),
      body: item.body.trim(),
      source: "META_AI_SYNTHESIS" as const,
      niche: args.niche
    }));

    return { items, modelMeta };
  } catch (err) {
    const classified = classifyGeminiError(err);
    return { items: [], error: classified.message };
  }
}
