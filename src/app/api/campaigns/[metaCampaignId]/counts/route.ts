import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { loadDrilldownCounts } from "@/lib/campaign-snapshot-query";
import { resolveMetaTokensForApi } from "@/lib/campaign-detail-api";
import { fetchAdSetsForCampaign, fetchAdsForCampaign } from "@/lib/meta-graph";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ metaCampaignId: string }> }
) {
  const { metaCampaignId } = await params;
  const { tenant, user, metaAccessToken: ctxToken } = await getAppContext();
  const live = new URL(req.url).searchParams.get("live") === "1";

  if (!live) {
    const counts = await loadDrilldownCounts(metaCampaignId);
    return NextResponse.json({ ok: true, ...counts });
  }

  const { metaAccessToken, fallbackMetaToken } = await resolveMetaTokensForApi(
    tenant.id,
    user.id,
    ctxToken
  );

  if (!metaAccessToken && !fallbackMetaToken) {
    const counts = await loadDrilldownCounts(metaCampaignId);
    return NextResponse.json({ ok: true, ...counts });
  }

  let adsets = 0;
  let ads = 0;
  for (const token of [metaAccessToken, fallbackMetaToken]) {
    if (!token) continue;
    try {
      const [adsetList, adList] = await Promise.all([
        fetchAdSetsForCampaign(token, metaCampaignId),
        fetchAdsForCampaign(token, metaCampaignId)
      ]);
      adsets = adsetList.length;
      ads = adList.length;
      break;
    } catch {
      /* try next token */
    }
  }

  return NextResponse.json({
    ok: true,
    adsets,
    ads,
    creatives: ads
  });
}
