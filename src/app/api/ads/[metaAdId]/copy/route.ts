import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { resolveMetaTokensForApi } from "@/lib/campaign-detail-api";
import { fetchAdCreativeCopy } from "@/lib/meta-graph";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ metaAdId: string }> }
) {
  const { metaAdId } = await params;
  const { tenant, user, metaAccessToken: ctxToken } = await getAppContext();
  const { metaAccessToken, fallbackMetaToken } = await resolveMetaTokensForApi(
    tenant.id,
    user.id,
    ctxToken
  );

  for (const token of [metaAccessToken, fallbackMetaToken]) {
    if (!token) continue;
    const copy = await fetchAdCreativeCopy(token, metaAdId);
    if (copy.bodies.length || copy.titles.length || copy.descriptions.length || copy.ctas.length) {
      return NextResponse.json({ ok: true, copy });
    }
  }
  return NextResponse.json({
    ok: true,
    copy: { bodies: [], titles: [], descriptions: [], ctas: [] }
  });
}
