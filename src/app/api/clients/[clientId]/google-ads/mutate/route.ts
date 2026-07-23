import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { getWorkspaceGoogleAccessToken } from "@/lib/google-auth-store";
import { isGoogleAdsConfigured, isGoogleAdsEnabled } from "@/lib/google-env";
import { GoogleAdsApiError } from "@/lib/google-ads-api";
import {
  addKeyword,
  setAdGroupStatus,
  setAdStatus,
  setCampaignStatus,
  setKeywordStatus,
  type GoogleEntityStatus,
  type MutateResponse
} from "@/lib/google-ads-mutations";
import { repositories } from "@/db/repositories";

const BodySchema = z.object({
  resource: z.enum(["campaign", "adGroup", "ad", "keyword"]),
  op: z.enum(["enable", "pause", "remove", "add", "addNegative"]),
  /** id principal: campaignId | adGroupId | adId | criterionId conforme resource/op. */
  id: z.string().optional(),
  /** grupo de anúncios (necessário p/ ad, keyword e para add/addNegative). */
  adGroupId: z.string().optional(),
  /** texto da palavra-chave (add/addNegative). */
  text: z.string().min(1).max(80).optional(),
  matchType: z.enum(["EXACT", "PHRASE", "BROAD"]).optional(),
  /** dry-run: valida no Google sem aplicar. Padrão TRUE (seguro). */
  dryRun: z.boolean().optional()
});

const STATUS_BY_OP: Record<"enable" | "pause" | "remove", GoogleEntityStatus> = {
  enable: "ENABLED",
  pause: "PAUSED",
  remove: "REMOVED"
};

/**
 * Escrita (mutations) do Google Ads para um cliente. Uma única rota que despacha para
 * a camada `google-ads-mutations`. `dryRun` padrão = true (valida sem aplicar). Toda
 * tentativa é auditada. Silo Google, gated pelo kill-switch.
 */
export async function POST(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  if (!isGoogleAdsEnabled()) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (!isGoogleAdsConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  const body = parsed.data;
  const dryRun = body.dryRun ?? true;

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

  const { auditLog: auditRepo } = await repositories();
  const audit = (success: boolean, response: unknown, errorMessage?: string) =>
    auditRepo.save(
      auditRepo.create({
        tenantId: tenant.id,
        clientId: client.id,
        kind: `GOOGLE_${body.resource.toUpperCase()}_${body.op.toUpperCase()}${dryRun ? "_DRYRUN" : ""}`,
        success,
        errorMessage,
        request: body,
        response: success ? response : undefined
      })
    );

  try {
    const result = await dispatch(token, customerId, body, dryRun);
    await audit(true, result);
    return NextResponse.json({ ok: true, dryRun, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha no mutate";
    const status = err instanceof GoogleAdsApiError ? err.status : 500;
    // 403 do Google com token só-leitura → sinaliza escrita bloqueada p/ a UI.
    const code = status === 403 ? "write_blocked" : "mutate_failed";
    await audit(false, null, message).catch(() => undefined);
    return NextResponse.json({ ok: false, error: code, message }, { status: status === 403 ? 403 : 502 });
  }
}

function dispatch(
  token: string,
  customerId: string,
  body: z.infer<typeof BodySchema>,
  dryRun: boolean
): Promise<MutateResponse> {
  const { resource, op } = body;

  // Adicionar palavra-chave / negativa (só resource keyword).
  if (op === "add" || op === "addNegative") {
    if (resource !== "keyword" || !body.adGroupId || !body.text || !body.matchType) {
      throw new GoogleAdsApiError("Parâmetros insuficientes para adicionar palavra-chave", 400);
    }
    return addKeyword(token, customerId, body.adGroupId, body.text, body.matchType, op === "addNegative", dryRun);
  }

  // Status (enable/pause/remove).
  const status = STATUS_BY_OP[op];
  if (resource === "campaign") {
    if (!body.id) throw new GoogleAdsApiError("id (campaignId) obrigatório", 400);
    return setCampaignStatus(token, customerId, body.id, status, dryRun);
  }
  if (resource === "adGroup") {
    if (!body.id) throw new GoogleAdsApiError("id (adGroupId) obrigatório", 400);
    return setAdGroupStatus(token, customerId, body.id, status, dryRun);
  }
  if (resource === "ad") {
    if (!body.id || !body.adGroupId) throw new GoogleAdsApiError("id (adId) e adGroupId obrigatórios", 400);
    return setAdStatus(token, customerId, body.adGroupId, body.id, status, dryRun);
  }
  // keyword
  if (!body.id || !body.adGroupId) throw new GoogleAdsApiError("id (criterionId) e adGroupId obrigatórios", 400);
  return setKeywordStatus(token, customerId, body.adGroupId, body.id, status, dryRun);
}
