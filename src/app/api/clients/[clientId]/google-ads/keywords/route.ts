import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { getWorkspaceGoogleAccessToken } from "@/lib/google-auth-store";
import { getKeywords } from "@/lib/google-ads-api";
import { isGoogleAdsConfigured, isGoogleAdsEnabled } from "@/lib/google-env";

function isoDay(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/** Palavras-chave de um cliente Google Ads, filtráveis por campanha/grupo. Só leitura. */
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
  const days = Math.min(Math.max(Number(url.searchParams.get("days")) || 30, 1), 365);

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
    const rows = await getKeywords(token, client.googleAdsCustomerId, {
      campaignId,
      adGroupId,
      range: { since: isoDay(days), until: isoDay(0) }
    });
    return NextResponse.json({ ok: true, count: rows.length, rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao buscar palavras-chave";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
