import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { resolveMetaTokensForApi } from "@/lib/campaign-detail-api";
import { fetchAdPreview } from "@/lib/meta-graph";

const VALID_FORMATS = new Set([
  "MOBILE_FEED_STANDARD",
  "DESKTOP_FEED_STANDARD",
  "INSTAGRAM_STANDARD",
  "INSTAGRAM_STORY",
  "FACEBOOK_STORY_MOBILE"
]);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ metaAdId: string }> }
) {
  const { metaAdId } = await params;
  const formatParam = new URL(req.url).searchParams.get("format") || "MOBILE_FEED_STANDARD";
  const format = VALID_FORMATS.has(formatParam) ? formatParam : "MOBILE_FEED_STANDARD";

  const { tenant, user, metaAccessToken: ctxToken } = await getAppContext();
  const { metaAccessToken, fallbackMetaToken } = await resolveMetaTokensForApi(
    tenant.id,
    user.id,
    ctxToken
  );

  for (const token of [metaAccessToken, fallbackMetaToken]) {
    if (!token) continue;
    const src = await fetchAdPreview(token, metaAdId, format);
    if (src) return NextResponse.json({ ok: true, src });
  }
  return NextResponse.json({ ok: false, error: "preview indisponível" }, { status: 404 });
}
