import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { validateClientAdAccount } from "@/lib/audience-api-helpers";
import { fetchPagePostsForAds } from "@/lib/meta-graph";

/**
 * Lista posts já publicados de uma Página, para usar como criativo de anúncio
 * via `object_story_id` (promover post existente — funciona em Development Mode).
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

  if (!clientId || !adAccountId || !pageId) {
    return NextResponse.json(
      { ok: false, error: "Informe clientId, adAccountId e pageId" },
      { status: 400 }
    );
  }

  const validation = await validateClientAdAccount(tenant.id, clientId, adAccountId);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: validation.status });
  }

  try {
    const posts = await fetchPagePostsForAds(metaAccessToken, pageId);
    return NextResponse.json({ ok: true, posts });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : "Falha ao carregar posts da Página"
    });
  }
}
