import "server-only";

import type { Client } from "@/db/entities/Client";
import type { MarketMemory, MarketCoverageLevel } from "@/db/entities/MarketMemory";
import { repositories } from "@/db/repositories";
import { extractMarketPatterns, buildScanStats } from "@/lib/agency-brain/market-pattern-extractor";
import type { MarketInsightDto } from "@/lib/agency-brain/market-learnings-service";
import {
  fetchMetaAdLibrary,
  isMetaAdLibraryConfigured,
  resolveCoverageLevel,
  resolveSearchTerms,
  type ClientCompetitor
} from "@/lib/meta-ad-library";

const TTL_HOURS = 72;

export function parseClientCompetitors(raw: unknown): ClientCompetitor[] {
  if (!Array.isArray(raw)) return [];
  const out: ClientCompetitor[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const name = String(o.name ?? "").trim();
    if (!name) continue;
    out.push({
      name,
      pageId: o.pageId ? String(o.pageId).trim() : undefined,
      pageUrl: o.pageUrl ? String(o.pageUrl).trim() : undefined
    });
  }
  return out;
}

export async function getValidMarketMemory(
  tenantId: string,
  clientId: string
): Promise<MarketMemory | null> {
  const { marketMemory: repo } = await repositories();
  const row = await repo.findOne({ where: { tenantId, clientId } });
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

export function memoryPatternsToInsights(
  memory: MarketMemory,
  niche: string | null
): MarketInsightDto[] {
  const raw = memory.patternsJson;
  if (!Array.isArray(raw)) return [];
  return raw as MarketInsightDto[];
}

export async function scanMarketForClient(
  tenantId: string,
  client: Client
): Promise<{
  memory: MarketMemory;
  patterns: MarketInsightDto[];
  coverageLevel: MarketCoverageLevel;
  apiConfigured: boolean;
  apiError?: string;
}> {
  const competitors = parseClientCompetitors(client.competitors);
  const searchTerms = resolveSearchTerms(client.niche);
  const marketCountry = client.marketCountry ?? "BR";

  if (!isMetaAdLibraryConfigured()) {
    console.warn(
      "[agency-brain/market_scan]",
      client.id,
      "SEARCHAPI_API_KEY or META_AD_LIBRARY_ACCESS_TOKEN not configured — scan limited to niche static insights"
    );
  }

  const fetchResult = await fetchMetaAdLibrary({
    competitors: competitors.map((c) => ({ name: c.name, pageId: c.pageId })),
    searchTerms,
    marketCountry
  });

  if (fetchResult.apiError) {
    console.warn("[agency-brain/market_scan]", client.id, fetchResult.apiError, {
      adsCount: fetchResult.ads.length,
      competitors: competitors.length
    });
  } else if (fetchResult.apiConfigured) {
    console.info("[agency-brain/market_scan]", client.id, {
      adsCount: fetchResult.ads.length,
      competitors: competitors.length,
      searchTerms: searchTerms.slice(0, 3)
    });
  }

  const patterns = extractMarketPatterns(fetchResult.ads, client.niche ?? null);
  const stats = buildScanStats(fetchResult.ads);
  const coverageLevel = resolveCoverageLevel({
    marketCountry,
    adsCount: fetchResult.ads.length,
    apiConfigured: fetchResult.apiConfigured
  });

  const now = new Date();
  const expiresAt = new Date(now.getTime() + TTL_HOURS * 3600000);

  const { marketMemory: repo } = await repositories();
  let memory = await repo.findOne({ where: { tenantId, clientId: client.id } });

  if (!memory) {
    memory = repo.create({
      tenantId,
      clientId: client.id,
      niche: client.niche ?? null,
      marketCountry,
      patternsJson: patterns,
      rawStatsJson: stats,
      coverageLevel,
      adsAnalyzed: stats.adsAnalyzed,
      competitorsScanned: stats.competitorsScanned,
      fetchedAt: now,
      expiresAt
    });
  } else {
    memory.niche = client.niche ?? null;
    memory.marketCountry = marketCountry;
    memory.patternsJson = patterns;
    memory.rawStatsJson = stats;
    memory.coverageLevel = coverageLevel;
    memory.adsAnalyzed = stats.adsAnalyzed;
    memory.competitorsScanned = stats.competitorsScanned;
    memory.fetchedAt = now;
    memory.expiresAt = expiresAt;
  }

  await repo.save(memory);

  return {
    memory,
    patterns,
    coverageLevel,
    apiConfigured: fetchResult.apiConfigured,
    apiError: fetchResult.apiError
  };
}

export async function saveSynthesisToMemory(
  tenantId: string,
  clientId: string,
  synthesisItems: MarketInsightDto[]
): Promise<void> {
  const memory = await getValidMarketMemory(tenantId, clientId);
  if (!memory) return;

  const existing = memoryPatternsToInsights(memory, memory.niche ?? null);
  const synthIds = new Set(synthesisItems.map((i) => i.id));
  const merged = [...synthesisItems, ...existing.filter((i) => !synthIds.has(i.id))];

  memory.patternsJson = merged;
  const { marketMemory: repo } = await repositories();
  await repo.save(memory);
}
