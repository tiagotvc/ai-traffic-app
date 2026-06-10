import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { resolveMetaTokensForApi } from "@/lib/campaign-detail-api";
import { fetchAdsForCampaign } from "@/lib/meta-graph";

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

  const ads = await loadAds(metaCampaignId, metaAccessToken ?? undefined, fallbackMetaToken);
  return NextResponse.json({ ok: true, ads, total: ads.length });
}
