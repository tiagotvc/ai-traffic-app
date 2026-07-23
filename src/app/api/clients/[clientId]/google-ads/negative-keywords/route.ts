import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { getWorkspaceGoogleAccessToken } from "@/lib/google-auth-store";
import { getNegativeKeywords } from "@/lib/google-ads-api";
import { isGoogleAdsConfigured, isGoogleAdsEnabled } from "@/lib/google-env";

/** Palavras-chave NEGATIVAS de nível de grupo, filtráveis por campanha/grupo. Só leitura. */
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
    const rows = await getNegativeKeywords(token, client.googleAdsCustomerId, {
      campaignId,
      adGroupId
    });
    return NextResponse.json({ ok: true, count: rows.length, rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao buscar palavras-chave negativas";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
