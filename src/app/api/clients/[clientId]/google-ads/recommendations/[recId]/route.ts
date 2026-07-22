import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { getWorkspaceGoogleAccessToken } from "@/lib/google-auth-store";
import { isGoogleAdsConfigured, isGoogleAdsEnabled } from "@/lib/google-env";
import { GoogleAdsApiError } from "@/lib/google-ads-api";
import {
  addKeyword,
  setKeywordStatus,
  type GoogleMatchType
} from "@/lib/google-ads-mutations";
import { repositories } from "@/db/repositories";
import type { GoogleKeywordRecommendation } from "@/db/entities/GoogleKeywordRecommendation";

const BodySchema = z.object({ action: z.enum(["accept", "reject"]) });

const MATCH: Record<string, GoogleMatchType> = { EXACT: "EXACT", PHRASE: "PHRASE", BROAD: "BROAD" };
const matchOf = (m?: string | null): GoogleMatchType => MATCH[(m ?? "").toUpperCase()] ?? "PHRASE";

/**
 * Aceita (aplica) ou rejeita (descarta) uma recomendação de palavra-chave.
 * - reject → status DISMISSED (o recompute respeita e nunca ressuscita; além disso
 *   os termos rejeitados alimentam o prompt da IA como exemplos negativos).
 * - accept → aplica no Google via camada de mutations e marca APPLIED. Com o token
 *   só-leitura o Google recusa (403) → devolve `write_blocked` e mantém PENDING.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ clientId: string; recId: string }> }
) {
  if (!isGoogleAdsEnabled()) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  const { action } = parsed.data;

  const { clientId, recId } = await params;
  const { tenant } = await getAppContext();
  const client = await getClientBySlugOrId(tenant.id, clientId);
  if (!client) {
    return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
  }

  const { googleKeywordRecommendation: recRepo, auditLog: auditRepo } = await repositories();
  const rec = await recRepo.findOne({ where: { id: recId, tenantId: tenant.id, clientId: client.id } });
  if (!rec) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  // ---- Rejeitar: só marca DISMISSED (feedback p/ a IA vem na próxima recompute). ----
  if (action === "reject") {
    rec.status = "DISMISSED";
    await recRepo.save(rec);
    return NextResponse.json({ ok: true, status: rec.status });
  }

  // ---- Aceitar: aplica no Google. ----
  if (!isGoogleAdsConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  const customerId = client.googleAdsCustomerId ?? "";
  if (!customerId) {
    return NextResponse.json({ ok: false, error: "not_linked" }, { status: 409 });
  }
  const token = await getWorkspaceGoogleAccessToken(tenant.id);
  if (!token) {
    return NextResponse.json({ ok: false, error: "not_connected" }, { status: 409 });
  }

  const audit = (success: boolean, response: unknown, errorMessage?: string) =>
    auditRepo.save(
      auditRepo.create({
        tenantId: tenant.id,
        clientId: client.id,
        kind: `GOOGLE_REC_APPLY_${rec.actionType}`,
        success,
        errorMessage,
        request: { recId: rec.id, actionType: rec.actionType, keyword: rec.keywordText },
        response: success ? response : undefined
      })
    );

  try {
    const result = await applyRecommendation(token, customerId, rec);
    rec.status = "APPLIED";
    await recRepo.save(rec);
    await audit(true, result);
    return NextResponse.json({ ok: true, status: rec.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao aplicar";
    const status = err instanceof GoogleAdsApiError ? err.status : 500;
    const code = status === 403 ? "write_blocked" : "apply_failed";
    await audit(false, null, message).catch(() => undefined);
    // Mantém PENDING para o usuário poder reaplicar quando o token for aprovado.
    return NextResponse.json({ ok: false, error: code, message }, { status: status === 403 ? 403 : 502 });
  }
}

function applyRecommendation(token: string, customerId: string, rec: GoogleKeywordRecommendation) {
  const matchType = matchOf(rec.matchType);
  switch (rec.actionType) {
    case "ADICIONAR_KEYWORD":
      if (!rec.adGroupId) throw new GoogleAdsApiError("Recomendação sem grupo", 400);
      return addKeyword(token, customerId, rec.adGroupId, rec.keywordText, matchType, false, false);
    case "NEGATIVAR":
      if (!rec.adGroupId) throw new GoogleAdsApiError("Recomendação sem grupo", 400);
      return addKeyword(token, customerId, rec.adGroupId, rec.keywordText, matchType, true, false);
    case "PAUSAR":
      if (!rec.adGroupId || !rec.criterionId) throw new GoogleAdsApiError("Recomendação sem critério", 400);
      return setKeywordStatus(token, customerId, rec.adGroupId, rec.criterionId, "PAUSED", false);
    default:
      // Ajustes de lance (REDUZIR/AUMENTAR) ainda não têm aplicação na camada de escrita.
      throw new GoogleAdsApiError("Ação ainda não suportada para aplicação automática", 400);
  }
}
