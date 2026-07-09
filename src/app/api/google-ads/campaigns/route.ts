import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { getStoredGoogleAccessToken } from "@/lib/google-auth-store";
import { getCampaignMetrics } from "@/lib/google-ads-api";
import { isGoogleAdsConfigured, isGoogleAdsEnabled } from "@/lib/google-env";

/**
 * Métricas de campanha de uma conta Google Ads (só leitura — funciona com o token
 * de permissible use "Reporting"). Ex.: /api/google-ads/campaigns?customerId=123&range=LAST_7_DAYS
 */
export async function GET(req: Request) {
  if (!isGoogleAdsEnabled()) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (!isGoogleAdsConfigured()) {
    return NextResponse.json({ ok: false, error: "Google Ads não configurado" }, { status: 503 });
  }

  const url = new URL(req.url);
  const customerId = (url.searchParams.get("customerId") ?? "").replace(/\D/g, "");
  const range = url.searchParams.get("range") ?? undefined;

  if (!customerId) {
    return NextResponse.json(
      { ok: false, error: "Informe ?customerId=<id da conta>" },
      { status: 400 }
    );
  }

  let userId: string;
  try {
    const ctx = await getAppContext();
    userId = ctx.user.id;
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = await getStoredGoogleAccessToken(userId);
  if (!accessToken) {
    return NextResponse.json({ ok: false, error: "not_connected" }, { status: 409 });
  }

  try {
    const campaigns = await getCampaignMetrics(accessToken, customerId, { dateRange: range });
    return NextResponse.json({ ok: true, customerId, count: campaigns.length, campaigns });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao buscar métricas";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
