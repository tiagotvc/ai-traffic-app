import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { apiErrorResponse } from "@/lib/api-auth";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { defaultCampaignDraft } from "@/lib/campaign-draft";
import { assertFeatureEnabled, FeatureDisabledError } from "@/lib/feature-flags/service";
import { uploadAdVideo } from "@/lib/meta-graph";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const BodySchema = z.object({
  clientSlug: z.string().min(1),
  videoBase64: z.string().min(100),
  headline: z.string().max(90).default(""),
  body: z.string().max(300).default(""),
  locale: z.string().default("pt-BR")
});

/** Sobe o vídeo (slideshow gerado no Creative Video) pra Meta e monta um rascunho de
 * campanha já com o vídeo aplicado no anúncio — mesmo princípio do commit de imagem. */
export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json().catch(() => ({})));
    const { tenant, metaAccessToken } = await getAppContext();
    await assertFeatureEnabled("creative-studio");
    if (!metaAccessToken) {
      return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
    }

    const client = await getClientBySlugOrId(tenant.id, body.clientSlug);
    if (!client) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    const { adAccount: adAccountRepo, campaignTemplate } = await repositories();
    const accounts = await adAccountRepo.find({ where: { clientId: client.id } });
    const account = accounts[0];
    if (!account) {
      return NextResponse.json(
        { ok: false, error: "Cliente sem conta de anúncio conectada" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(body.videoBase64, "base64");
    const uploaded = await uploadAdVideo(
      metaAccessToken,
      account.metaAdAccountId,
      buffer,
      `creative-video-${Date.now()}.mp4`,
      body.headline || "Vídeo gerado no Creative Video"
    );

    const draft = defaultCampaignDraft(body.locale);
    draft.clientSlug = client.id;
    draft.ads[0]!.format = "video";
    draft.ads[0]!.videoIds = [uploaded.id];
    draft.ads[0]!.titles = body.headline ? [body.headline] : [];
    draft.ads[0]!.bodies = body.body ? [body.body] : [];
    const campaignName = `Creative Video — ${body.headline || "slideshow"}`.slice(0, 120);
    draft.campaign.name = campaignName;

    const template = await campaignTemplate.save(
      campaignTemplate.create({
        tenantId: tenant.id,
        clientId: client.id,
        name: campaignName,
        payload: draft
      })
    );

    return NextResponse.json({ ok: true, videoId: uploaded.id, draftId: template.id });
  } catch (err) {
    if (err instanceof FeatureDisabledError) {
      return NextResponse.json({ ok: false, error: "Recurso desabilitado" }, { status: 403 });
    }
    const authResponse = apiErrorResponse(err, "creative-video/commit");
    if (authResponse.status !== 500) return authResponse;
    console.error("[creative-video/commit]", err);
    return NextResponse.json({ ok: false, error: "Falha ao enviar vídeo pra Meta. Tenta de novo." }, { status: 500 });
  }
}
