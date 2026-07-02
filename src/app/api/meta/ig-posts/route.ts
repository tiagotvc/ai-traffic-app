import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { validateClientAdAccount } from "@/lib/audience-api-helpers";
import {
  fetchInstagramAccountsForAdAccount,
  fetchInstagramBusinessAccountForPage,
  fetchInstagramFromPages,
  fetchInstagramPostsForAds
} from "@/lib/meta-graph";

/**
 * Lists an Instagram account's published media so it can be promoted as an ad
 * creative via `source_instagram_media_id` (existing IG post). Resolves the IG
 * account connected to the given Page, falling back to the ad account's
 * authorized Instagram accounts.
 */
export async function GET(req: Request) {
  const { tenant, metaAccessToken } = await getAppContext();
  if (!metaAccessToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId") ?? "";
  const adAccountId = searchParams.get("adAccountId") ?? "";
  const pageId = searchParams.get("pageId") ?? "";

  if (!clientId || !adAccountId) {
    return NextResponse.json({ ok: false, error: "Informe clientId e adAccountId" }, { status: 400 });
  }

  const validation = await validateClientAdAccount(tenant.id, clientId, adAccountId);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: validation.status });
  }

  let ig: { id: string; username?: string } | undefined;
  try {
    // Prefer the documented Business account field (readable by /media); fall
    // back to connected_instagram_account and the ad account's IG accounts.
    ig = pageId
      ? (await fetchInstagramBusinessAccountForPage(metaAccessToken, pageId)) ?? undefined
      : undefined;
    if (!ig && pageId) ig = (await fetchInstagramFromPages(metaAccessToken, [pageId]))[0];
    if (!ig) ig = (await fetchInstagramAccountsForAdAccount(metaAccessToken, adAccountId))[0];
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : "Falha ao resolver a conta do Instagram"
    });
  }

  if (!ig) {
    return NextResponse.json({ ok: false, error: "no_ig_account", igUserId: null });
  }

  try {
    const posts = await fetchInstagramPostsForAds(metaAccessToken, ig.id);
    return NextResponse.json({ ok: true, igUserId: ig.id, username: ig.username ?? null, posts });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : "Falha ao carregar posts do Instagram"
    });
  }
}
