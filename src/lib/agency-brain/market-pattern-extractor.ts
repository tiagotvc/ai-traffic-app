import "server-only";

import { createHash } from "crypto";

import type { MarketInsightDto } from "@/lib/agency-brain/market-learnings-service";
import type { NormalizedAd, MarketScanStats } from "@/lib/meta-ad-library/types";

function insightId(title: string, index: number): string {
  const hash = createHash("sha1").update(`meta_ad_library:${title}`).digest("hex").slice(0, 10);
  return `meta-ad-library-${index}-${hash}`;
}

function topEntries(counts: Record<string, number>, limit: number): Array<[string, number]> {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function hookKey(ad: NormalizedAd): string {
  const text = (ad.headline || ad.body).trim();
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

function weightedScore(count: number, avgDays: number): number {
  return count * (1 + Math.min(avgDays, 90) / 30);
}

export function buildScanStats(ads: NormalizedAd[]): MarketScanStats {
  const hooks: Record<string, number> = {};
  const ctas: Record<string, number> = {};
  const formats: Record<string, number> = {};

  for (const ad of ads) {
    const hook = hookKey(ad);
    hooks[hook] = (hooks[hook] ?? 0) + 1;
    if (ad.cta) ctas[ad.cta] = (ctas[ad.cta] ?? 0) + 1;
    formats[ad.format] = (formats[ad.format] ?? 0) + 1;
  }

  const competitorsScanned = new Set(
    ads.map((a) => a.competitorName || a.pageName).filter(Boolean)
  ).size;

  return {
    adsAnalyzed: ads.length,
    competitorsScanned,
    hooks,
    ctas,
    formats
  };
}

export function extractMarketPatterns(ads: NormalizedAd[], niche: string | null): MarketInsightDto[] {
  if (ads.length === 0) return [];

  const stats = buildScanStats(ads);
  const insights: MarketInsightDto[] = [];
  let index = 0;

  const hookDays = new Map<string, number[]>();
  for (const ad of ads) {
    const key = hookKey(ad);
    const arr = hookDays.get(key) ?? [];
    arr.push(ad.daysRunning);
    hookDays.set(key, arr);
  }

  for (const [hook, count] of topEntries(stats.hooks, 5)) {
    const days = hookDays.get(hook) ?? [];
    const avgDaysRunning = days.length
      ? Math.round(days.reduce((a, b) => a + b, 0) / days.length)
      : 0;
    const sample = ads.find((a) => hookKey(a) === hook);
    const competitorName = sample?.competitorName ?? sample?.pageName;

    insights.push({
      id: insightId(hook, index++),
      title: "Hook recorrente",
      body: `"${hook}" — ${count} anúncio(s), média ${avgDaysRunning} dias no ar.`,
      source: "META_AD_LIBRARY",
      niche,
      evidence: {
        adsAnalyzed: count,
        competitorName,
        avgDaysRunning,
        hook,
        libraryUrl: sample?.libraryUrl,
        sampleLibraryUrls: ads
          .filter((a) => hookKey(a) === hook)
          .slice(0, 3)
          .map((a) => a.libraryUrl)
      }
    });
  }

  const total = ads.length;
  for (const [format, count] of topEntries(stats.formats, 3)) {
    if (format === "unknown") continue;
    const pct = Math.round((count / total) * 100);
    insights.push({
      id: insightId(`format-${format}`, index++),
      title: "Formato dominante",
      body: `${pct}% dos anúncios usam formato ${format} (${count}/${total}).`,
      source: "META_AD_LIBRARY",
      niche,
      evidence: {
        adsAnalyzed: count,
        format,
        saturationPct: pct
      }
    });
  }

  for (const [cta, count] of topEntries(stats.ctas, 3)) {
    const pct = Math.round((count / total) * 100);
    insights.push({
      id: insightId(`cta-${cta}`, index++),
      title: "CTA dominante",
      body: `CTA "${cta}" aparece em ${pct}% dos anúncios (${count}/${total}).`,
      source: "META_AD_LIBRARY",
      niche,
      evidence: {
        adsAnalyzed: count,
        dominantCta: cta,
        saturationPct: pct
      }
    });
  }

  insights.sort((a, b) => {
    const scoreA = weightedScore(
      a.evidence?.adsAnalyzed ?? 0,
      a.evidence?.avgDaysRunning ?? 0
    );
    const scoreB = weightedScore(
      b.evidence?.adsAnalyzed ?? 0,
      b.evidence?.avgDaysRunning ?? 0
    );
    return scoreB - scoreA;
  });

  return insights;
}
