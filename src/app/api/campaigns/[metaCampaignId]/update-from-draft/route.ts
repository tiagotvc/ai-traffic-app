import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { parseCampaignDraftPayload } from "@/lib/campaign-draft";
import { getOrCreateClientMetaSettings } from "@/lib/client-meta-settings";
import { applyDraftToPublishedCampaign } from "@/lib/meta-campaign-update";

/**
 * Aplica um rascunho em modo edição sobre uma campanha já publicada.
 * Diferente de `/publish`, não cria entidades: só atualiza as que o rascunho
 * carrega com id da Meta (`metaAdsetId` / `metaAdId`).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ metaCampaignId: string }> }
) {
  const { metaCampaignId } = await params;
  const { tenant, user, metaAccessToken } = await getAppContext();
  if (!metaAccessToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  let draft;
  try {
    const body = await req.json();
    draft = parseCampaignDraftPayload(body?.draft);
  } catch {
    return NextResponse.json({ ok: false, error: "Rascunho inválido" }, { status: 400 });
  }

  if (draft.meta?.publishMode !== "edit") {
    return NextResponse.json(
      { ok: false, error: "Rascunho não está em modo de edição" },
      { status: 400 }
    );
  }
  // O id da URL manda: evita que um rascunho adulterado edite outra campanha.
  if (draft.meta?.targetMetaCampaignId && draft.meta.targetMetaCampaignId !== metaCampaignId) {
    return NextResponse.json(
      { ok: false, error: "Rascunho aponta para outra campanha" },
      { status: 400 }
    );
  }

  const adAccountId = draft.adAccountId?.trim();
  if (!adAccountId) {
    return NextResponse.json({ ok: false, error: "Rascunho sem conta de anúncios" }, { status: 400 });
  }

  try {
    const client = draft.clientSlug
      ? await getClientBySlugOrId(tenant.id, draft.clientSlug).catch(() => null)
      : null;
    const resolved = client ? await getOrCreateClientMetaSettings(client.id) : null;

    const { results } = await applyDraftToPublishedCampaign({
      accessToken: metaAccessToken,
      adAccountId,
      draft: { ...draft, meta: { ...draft.meta, targetMetaCampaignId: metaCampaignId } },
      settings: resolved ?? undefined,
      tenantId: tenant.id,
      userId: user.id
    });

    const failed = results.filter((r) => r.error);
    return NextResponse.json({
      ok: failed.length === 0,
      results,
      updated: results.filter((r) => !r.error && r.changed.length).length,
      failed: failed.length
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Falha ao atualizar a campanha";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
