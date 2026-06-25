import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { resolveMetaTokensForApi } from "@/lib/campaign-detail-api";
import { loadAdsFromSnapshots } from "@/lib/campaign-snapshot-query";
import {
  fetchAdInsightsForCampaign,
  fetchAdsForCampaign,
  type AdInsightMetrics
} from "@/lib/meta-graph";
import { parsePeriodFromSearchParams, periodToMetaInsightsRange } from "@/lib/report-period";

// Pode buscar anúncios + insights por anúncio na Meta — dá folga.
export const maxDuration = 30;

async function loadAds(
  metaCampaignId: string,
  primaryToken?: string,
  fallbackToken?: string
) {
  for (const token of [primaryToken, fallbackToken]) {
    if (!token) continue;
    try {
      return await fetchAdsForCampaign(token, metaCampaignId);
    } catch {
      /* try fallback token */
    }
  }
  return [];
}

async function loadAdMetrics(
  metaCampaignId: string,
  primaryToken?: string,
  fallbackToken?: string,
  period?: ReturnType<typeof parsePeriodFromSearchParams>
): Promise<Map<string, AdInsightMetrics>> {
  const range = period ? periodToMetaInsightsRange(period) : { datePreset: "last_7d" };
  for (const token of [primaryToken, fallbackToken]) {
    if (!token) continue;
    const map = await fetchAdInsightsForCampaign(token, metaCampaignId, range);
    if (map.size > 0) return map;
  }
  return new Map();
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ metaCampaignId: string }> }
) {
  const { metaCampaignId } = await params;
  const { tenant, user, metaAccessToken: ctxToken } = await getAppContext();
  const url = new URL(req.url);
  const period = parsePeriodFromSearchParams(url);
  const live = url.searchParams.get("live") === "1";
  const { metaAccessToken, fallbackMetaToken } = await resolveMetaTokensForApi(
    tenant.id,
    user.id,
    ctxToken
  );

  if (live) {
    if (!metaAccessToken && !fallbackMetaToken) {
      return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
    }

    const [ads, metricsMap] = await Promise.all([
      loadAds(metaCampaignId, metaAccessToken ?? undefined, fallbackMetaToken),
      loadAdMetrics(metaCampaignId, metaAccessToken ?? undefined, fallbackMetaToken, period)
    ]);

    const adsWithMetrics = ads.map((a) => ({ ...a, metrics: metricsMap.get(a.id) ?? null }));
    return NextResponse.json({ ok: true, ads: adsWithMetrics, total: adsWithMetrics.length });
  }

  const ads = await loadAdsFromSnapshots(metaCampaignId, period);
  return NextResponse.json({ ok: true, ads, total: ads.length });
}
