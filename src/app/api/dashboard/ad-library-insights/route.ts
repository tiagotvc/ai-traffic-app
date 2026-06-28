import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { buildScanStats } from "@/lib/agency-brain/market-pattern-extractor";
import type { DashboardAdLibraryInsights, DashboardAdLibrarySegment } from "@/uxpilot-ui/adapters/dashboard-mappers";
import {
  fetchMetaAdLibrary,
  isMetaAdLibraryConfigured,
  resolveSearchTerms
} from "@/lib/meta-ad-library";
import { parseClientCompetitors } from "@/lib/agency-brain/market-memory-service";

const FORMAT_COLORS: Record<string, string> = {
  video: "#7c3aed",
  image: "#6366f1",
  carousel: "#10b981",
  unknown: "#94a3b8"
};

const CTA_COLORS = ["#f59e0b", "#ec4899", "#14b8a6", "#3b82f6", "#ef4444", "#8b5cf6"];

const SAMPLE_INSIGHTS: DashboardAdLibraryInsights = {
  source: "sample",
  apiConfigured: false,
  adsAnalyzed: 0,
  formats: [
    { id: "video", label: "Video", count: 38, sharePct: 42, color: FORMAT_COLORS.video },
    { id: "image", label: "Image", count: 31, sharePct: 34, color: FORMAT_COLORS.image },
    { id: "carousel", label: "Carousel", count: 22, sharePct: 24, color: FORMAT_COLORS.carousel }
  ],
  ctas: [
    { id: "cta-1", label: "Saiba mais", count: 28, sharePct: 31, color: CTA_COLORS[0] },
    { id: "cta-2", label: "Comprar agora", count: 24, sharePct: 27, color: CTA_COLORS[1] },
    { id: "cta-3", label: "Cadastre-se", count: 19, sharePct: 21, color: CTA_COLORS[2] }
  ]
};

function toSegments(
  counts: Record<string, number>,
  colorFor: (key: string, index: number) => string,
  limit = 5
): DashboardAdLibrarySegment[] {
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  if (total <= 0) return [];

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count], index) => ({
      id: `${label}-${index}`,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      count,
      sharePct: Math.round((count / total) * 100),
      color: colorFor(label, index)
    }));
}

function formatLabel(key: string): string {
  if (key === "unknown") return "Outros";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export async function GET(req: Request) {
  try {
    const { tenant } = await getAppContext();
    const url = new URL(req.url);
    const clientFilter = url.searchParams.get("clientId")?.trim() || null;

    const apiConfigured = isMetaAdLibraryConfigured();
    if (!apiConfigured) {
      return NextResponse.json({ ok: true, ...SAMPLE_INSIGHTS });
    }

    let searchTerms = resolveSearchTerms(null);
    let marketCountry = "BR";
    let competitors: Array<{ name: string; pageId?: string }> = [];

    if (clientFilter) {
      const client = await getClientBySlugOrId(tenant.id, clientFilter);
      if (client) {
        searchTerms = resolveSearchTerms(client.niche);
        marketCountry = client.marketCountry ?? "BR";
        competitors = parseClientCompetitors(client.competitors).map((c) => ({
          name: c.name,
          pageId: c.pageId
        }));
      }
    }

    const fetchResult = await fetchMetaAdLibrary({
      competitors,
      searchTerms,
      marketCountry
    });

    if (fetchResult.ads.length === 0) {
      const payload: DashboardAdLibraryInsights = {
        source: fetchResult.apiError ? "empty" : "sample",
        apiConfigured: true,
        adsAnalyzed: 0,
        formats: SAMPLE_INSIGHTS.formats,
        ctas: SAMPLE_INSIGHTS.ctas,
        error: fetchResult.apiError ?? null
      };
      return NextResponse.json({ ok: true, ...payload });
    }

    const stats = buildScanStats(fetchResult.ads);
    const formats = toSegments(
      Object.fromEntries(Object.entries(stats.formats).map(([k, v]) => [formatLabel(k), v])),
      (key) => FORMAT_COLORS[key.toLowerCase()] ?? FORMAT_COLORS.unknown
    );
    const ctas = toSegments(stats.ctas, (_, index) => CTA_COLORS[index % CTA_COLORS.length]);

    const payload: DashboardAdLibraryInsights = {
      source: "live",
      apiConfigured: true,
      adsAnalyzed: stats.adsAnalyzed,
      formats,
      ctas,
      error: fetchResult.apiError ?? null
    };

    return NextResponse.json({ ok: true, ...payload });
  } catch (err) {
    console.error("[dashboard/ad-library-insights GET]", err);
    return NextResponse.json({ ok: true, ...SAMPLE_INSIGHTS, error: "fetch_failed" });
  }
}
