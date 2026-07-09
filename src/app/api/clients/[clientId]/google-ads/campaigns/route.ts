import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { getWorkspaceGoogleAccessToken } from "@/lib/google-auth-store";
import { getCampaignMetrics } from "@/lib/google-ads-api";
import { isGoogleAdsConfigured, isGoogleAdsEnabled } from "@/lib/google-env";

/**
 * Métricas de campanha Google Ads de um cliente (só leitura). Resolve a conta
 * vinculada (client.googleAdsCustomerId) + token do workspace e chama getCampaignMetrics.
 * Ex.: /api/clients/<id>/google-ads/campaigns?range=LAST_30_DAYS
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

  const { clientId } = await params;
  const { tenant } = await getAppContext();
  const client = await getClientBySlugOrId(tenant.id, clientId);
  if (!client) {
    return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
  }

  const customerId = client.googleAdsCustomerId ?? "";
  if (!customerId) {
    return NextResponse.json({ ok: false, error: "not_linked" }, { status: 409 });
  }

  const token = await getWorkspaceGoogleAccessToken(tenant.id);
  if (!token) {
    return NextResponse.json({ ok: false, error: "not_connected" }, { status: 409 });
  }

  const url = new URL(req.url);
  const range = url.searchParams.get("range") ?? undefined;

  try {
    const campaigns = await getCampaignMetrics(token, customerId, { dateRange: range });
    return NextResponse.json({ ok: true, customerId, count: campaigns.length, campaigns });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao buscar métricas";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
