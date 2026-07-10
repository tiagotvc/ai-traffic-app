import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { syncGoogleAdsForClient } from "@/lib/google-ads-sync";
import { isGoogleAdsConfigured, isGoogleAdsEnabled } from "@/lib/google-env";

// Backfill faz várias chamadas GAQL — dá folga no timeout.
export const maxDuration = 60;

/** Dispara o sync (backfill) dos snapshots Google Ads de um cliente. ?days=30 */
export async function POST(
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

  const url = new URL(req.url);
  const days = Number(url.searchParams.get("days")) || 30;

  const result = await syncGoogleAdsForClient(tenant.id, client.id, { days });
  const status = result.ok ? 200 : result.error === "api_error" ? 502 : 409;
  return NextResponse.json(result, { status });
}
