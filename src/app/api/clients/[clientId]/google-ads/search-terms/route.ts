import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { getWorkspaceGoogleAccessToken } from "@/lib/google-auth-store";
import { getSearchTerms } from "@/lib/google-ads-api";
import { isGoogleAdsConfigured, isGoogleAdsEnabled } from "@/lib/google-env";
import { googleRangeFromParams } from "@/lib/google-ads-range";

/**
 * Termos de pesquisa de um cliente Google Ads (com a keyword que ativou e o status),
 * filtráveis por campanha/grupo/palavra-chave. Só leitura, ao vivo.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  if (!isGoogleAdsEnabled()) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (!isGoogleAdsConfigured()) {
    return NextResponse.json({ ok: false, error: "Google Ads não configurado" }, { status: 503 });
  }

  const url = new URL(req.url);
  const campaignId = url.searchParams.get("campaignId")?.replace(/\D/g, "") || undefined;
  const adGroupId = url.searchParams.get("adGroupId")?.replace(/\D/g, "") || undefined;
  const keyword = url.searchParams.get("keyword")?.trim() || undefined;
  const { since, until } = googleRangeFromParams(url);

  const { clientId } = await params;
  const { tenant } = await getAppContext();
  const client = await getClientBySlugOrId(tenant.id, clientId);
  if (!client?.googleAdsCustomerId) {
    return NextResponse.json({ ok: false, error: "not_linked" }, { status: 409 });
  }

  const token = await getWorkspaceGoogleAccessToken(tenant.id);
  if (!token) {
    return NextResponse.json({ ok: false, error: "not_connected" }, { status: 409 });
  }

  try {
    const rows = await getSearchTerms(token, client.googleAdsCustomerId, {
      campaignId,
      adGroupId,
      keyword,
      range: { since, until }
    });
    return NextResponse.json({ ok: true, count: rows.length, rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao buscar termos de pesquisa";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
