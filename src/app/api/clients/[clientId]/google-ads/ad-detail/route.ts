import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { getWorkspaceGoogleAccessToken } from "@/lib/google-auth-store";
import { getAdDetail } from "@/lib/google-ads-api";
import { isGoogleAdsConfigured, isGoogleAdsEnabled } from "@/lib/google-env";

function isoDay(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/** Conteúdo de um anúncio Google Ads (títulos/descrições/URL). Só leitura, ao vivo. */
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
  const adId = (url.searchParams.get("adId") ?? "").replace(/\D/g, "");
  if (!adId) {
    return NextResponse.json({ ok: false, error: "missing_adId" }, { status: 400 });
  }
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
    const ad = await getAdDetail(token, client.googleAdsCustomerId, adId, {
      since: isoDay(days),
      until: isoDay(0)
    });
    return NextResponse.json({ ok: true, ad });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao buscar anúncio";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
