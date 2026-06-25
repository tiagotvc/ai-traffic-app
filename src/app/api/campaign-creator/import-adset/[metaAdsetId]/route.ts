import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { buildImportedAdConfig } from "@/lib/campaign-ad-import";
import type { AdSetDraftItem } from "@/lib/campaign-draft";
import { resolveMetaTokensForApi } from "@/lib/campaign-detail-api";
import { extractInheritedAdsetFromMeta } from "@/lib/meta-adset-import";
import {
  fetchAdCreativeCopy,
  fetchAdSetDetail,
  fetchAdsForAdSet,
  fetchAdWithCreative
} from "@/lib/meta-graph";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ metaAdsetId: string }> }
) {
  const { metaAdsetId } = await ctx.params;
  const includeAds = new URL(req.url).searchParams.get("includeAds") === "true";
  const { tenant, user, metaAccessToken: ctxToken } = await getAppContext();
  const { metaAccessToken, fallbackMetaToken } = await resolveMetaTokensForApi(
    tenant.id,
    user.id,
    ctxToken
  );

  for (const token of [metaAccessToken, fallbackMetaToken]) {
    if (!token) continue;
    try {
      const adsetDetail = await fetchAdSetDetail(token, metaAdsetId);
      const adsetName = adsetDetail.name ?? metaAdsetId;
      const adset: Partial<AdSetDraftItem> = extractInheritedAdsetFromMeta(adsetDetail, adsetName);

      let ads: ReturnType<typeof buildImportedAdConfig>[] | undefined;
      if (includeAds) {
        const metaAds = await fetchAdsForAdSet(token, metaAdsetId);
        ads = await Promise.all(
          metaAds.map(async (metaAd) => {
            const [creativeData, copy] = await Promise.all([
              fetchAdWithCreative(token, metaAd.id),
              fetchAdCreativeCopy(token, metaAd.id)
            ]);
            return {
              ...buildImportedAdConfig(creativeData.creative, copy),
              metaCreativeId: creativeData.creative?.id ?? null,
              sourceMetaAdId: metaAd.id
            };
          })
        );
      }

      return NextResponse.json({ ok: true, adset, ads, adsetName });
    } catch {
      /* try next token */
    }
  }

  return NextResponse.json(
    { ok: false, error: "Não foi possível importar o conjunto" },
    { status: 404 }
  );
}
