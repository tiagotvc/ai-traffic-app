import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { buildImportedAdConfig } from "@/lib/campaign-ad-import";
import { resolveMetaTokensForApi } from "@/lib/campaign-detail-api";
import { fetchAdCreativeCopy, fetchAdWithCreative } from "@/lib/meta-graph";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ metaAdId: string }> }
) {
  const { metaAdId } = await ctx.params;
  const { tenant, user, metaAccessToken: ctxToken } = await getAppContext();
  const { metaAccessToken, fallbackMetaToken } = await resolveMetaTokensForApi(
    tenant.id,
    user.id,
    ctxToken
  );

  for (const token of [metaAccessToken, fallbackMetaToken]) {
    if (!token) continue;
    try {
      const [creativeData, copy] = await Promise.all([
        fetchAdWithCreative(token, metaAdId),
        fetchAdCreativeCopy(token, metaAdId)
      ]);
      const imported = {
        ...buildImportedAdConfig(creativeData.creative, copy),
        metaCreativeId: creativeData.creative?.id ?? null,
        sourceMetaAdId: metaAdId
      };
      return NextResponse.json({
        ok: true,
        imported,
        adName: creativeData.name ?? metaAdId
      });
    } catch {
      /* try next token */
    }
  }

  return NextResponse.json({ ok: false, error: "Não foi possível importar o anúncio" }, { status: 404 });
}
