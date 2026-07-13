import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { getWorkspaceGoogleAccessToken } from "@/lib/google-auth-store";
import { getBreakdown, type GoogleAdsBreakdownDimension } from "@/lib/google-ads-api";
import { isGoogleAdsConfigured, isGoogleAdsEnabled } from "@/lib/google-env";
import { googleRangeFromParams } from "@/lib/google-ads-range";

const DIMENSIONS = new Set<GoogleAdsBreakdownDimension>([
  "device",
  "gender",
  "age",
  "search_term",
  "keyword"
]);

/**
 * Breakdown de dimensão do Google Ads para um cliente (só leitura, ao vivo).
 * Ex.: /api/clients/<id>/google-ads/breakdowns?dimension=search_term&days=30
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
  const dimension = url.searchParams.get("dimension") as GoogleAdsBreakdownDimension | null;
  if (!dimension || !DIMENSIONS.has(dimension)) {
    return NextResponse.json({ ok: false, error: "invalid_dimension" }, { status: 400 });
  }
  const { since, until } = googleRangeFromParams(url);

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

  try {
    const rows = await getBreakdown(token, customerId, dimension, { since, until });
    return NextResponse.json({ ok: true, dimension, count: rows.length, rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao buscar breakdown";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
