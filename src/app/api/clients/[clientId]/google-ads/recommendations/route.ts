import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { isGoogleAdsConfigured, isGoogleAdsEnabled } from "@/lib/google-env";
import { googleRangeFromParams } from "@/lib/google-ads-range";
import { recomputeGoogleKeywordRecommendations } from "@/lib/google-ads-recommendations";
import { repositories } from "@/db/repositories";
import type { GoogleRecommendationStatus } from "@/db/entities/GoogleKeywordRecommendation";

/**
 * Fila de recomendações de palavras-chave de um cliente Google Ads.
 * GET: lista a fila (ordenada por prioridade). POST: recalcula (só lê o Google,
 * grava a fila — nada é aplicado na conta). Silo Google, gated pelo kill-switch.
 */
export async function GET(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  if (!isGoogleAdsEnabled()) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "PENDING";
  const adGroupId = url.searchParams.get("adGroupId") || undefined;
  const campaignId = url.searchParams.get("campaignId") || undefined;

  const { clientId } = await params;
  const { tenant } = await getAppContext();
  const client = await getClientBySlugOrId(tenant.id, clientId);
  if (!client?.googleAdsCustomerId) {
    return NextResponse.json({ ok: false, error: "not_linked" }, { status: 409 });
  }

  const { googleKeywordRecommendation: recRepo } = await repositories();
  const where: {
    tenantId: string;
    clientId: string;
    status?: GoogleRecommendationStatus;
    adGroupId?: string;
    campaignId?: string;
  } = {
    tenantId: tenant.id,
    clientId: client.id
  };
  if (status !== "ALL") where.status = status as GoogleRecommendationStatus;
  if (adGroupId) where.adGroupId = adGroupId;
  if (campaignId) where.campaignId = campaignId;
  const rows = await recRepo.find({
    where,
    order: { score: "DESC", confidence: "DESC", createdAt: "DESC" }
  });

  return NextResponse.json({ ok: true, count: rows.length, rows });
}

export async function POST(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  if (!isGoogleAdsEnabled()) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (!isGoogleAdsConfigured()) {
    return NextResponse.json({ ok: false, error: "Google Ads não configurado" }, { status: 503 });
  }

  const url = new URL(req.url);
  const range = googleRangeFromParams(url);

  const { clientId } = await params;
  const { tenant } = await getAppContext();
  const client = await getClientBySlugOrId(tenant.id, clientId);
  if (!client?.googleAdsCustomerId) {
    return NextResponse.json({ ok: false, error: "not_linked" }, { status: 409 });
  }

  const result = await recomputeGoogleKeywordRecommendations(tenant.id, client.id, range);
  if (!result.ok) {
    const status = result.error === "api_error" ? 502 : 409;
    return NextResponse.json({ ok: false, error: result.error, message: result.message }, { status });
  }

  return NextResponse.json(result);
}
