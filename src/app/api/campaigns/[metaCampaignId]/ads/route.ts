import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { resolveMetaTokensForApi } from "@/lib/campaign-detail-api";
import {
  fetchAdInsightsForCampaign,
  fetchAdsForCampaign,
  type AdInsightMetrics
} from "@/lib/meta-graph";

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
  fallbackToken?: string
): Promise<Map<string, AdInsightMetrics>> {
  for (const token of [primaryToken, fallbackToken]) {
    if (!token) continue;
    const map = await fetchAdInsightsForCampaign(token, metaCampaignId);
    if (map.size > 0) return map;
  }
  return new Map();
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ metaCampaignId: string }> }
) {
  const { metaCampaignId } = await params;
  const { tenant, user, metaAccessToken: ctxToken } = await getAppContext();
  const { metaAccessToken, fallbackMetaToken } = await resolveMetaTokensForApi(
    tenant.id,
    user.id,
    ctxToken
  );

  if (!metaAccessToken && !fallbackMetaToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const [ads, metricsMap] = await Promise.all([
    loadAds(metaCampaignId, metaAccessToken ?? undefined, fallbackMetaToken),
    loadAdMetrics(metaCampaignId, metaAccessToken ?? undefined, fallbackMetaToken)
  ]);

  const adsWithMetrics = ads.map((a) => ({ ...a, metrics: metricsMap.get(a.id) ?? null }));

  return NextResponse.json({ ok: true, ads: adsWithMetrics, total: adsWithMetrics.length });
}
