import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { apiErrorResponse } from "@/lib/api-auth";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { defaultCampaignDraft } from "@/lib/campaign-draft";
import { uploadAdImageBytes } from "@/lib/meta-graph";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BodySchema = z.object({
  clientSlug: z.string().min(1),
  imageBase64: z.string().min(100),
  mimeType: z.string().default("image/png"),
  label: z.string().min(1).max(120),
  headline: z.string().min(1).max(90),
  body: z.string().min(1).max(300),
  locale: z.string().default("pt-BR")
});

/**
 * Sobe a variação escolhida pro Estúdio Criativo pra Meta, grava no catálogo de criativos
 * do cliente, e já monta um rascunho de campanha (`defaultCampaignDraft` + imagem/copy
 * aplicadas no anúncio) pronto pra abrir direto no Criador — fecha o "sem editor complexo"
 * de verdade, em vez de só copiar o texto pro clipboard.
 */
export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json().catch(() => ({})));
    const { tenant, metaAccessToken } = await getAppContext();
    if (!metaAccessToken) {
      return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
    }

    const client = await getClientBySlugOrId(tenant.id, body.clientSlug);
    if (!client) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    const { adAccount: adAccountRepo, creativeAsset: creativeAssetRepo, campaignTemplate } =
      await repositories();
    const accounts = await adAccountRepo.find({ where: { clientId: client.id } });
    const account = accounts[0];
    if (!account) {
      return NextResponse.json(
        { ok: false, error: "Cliente sem conta de anúncio conectada" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(body.imageBase64, "base64");
    const ext = body.mimeType.includes("png") ? "png" : "jpg";
    const fileName = `creative-studio-${Date.now()}.${ext}`;

    const uploaded = await uploadAdImageBytes(
      metaAccessToken,
      account.metaAdAccountId,
      buffer,
      fileName,
      body.label
    );
    const hash = Object.values(uploaded.images ?? {})[0]?.hash;
    if (!hash) {
      throw new Error("A Meta não retornou o hash da imagem");
    }

    await creativeAssetRepo.save(
      creativeAssetRepo.create({
        clientId: client.id,
        metaAdAccountId: account.metaAdAccountId,
        metaImageHash: hash,
        label: body.label
      })
    );

    const draft = defaultCampaignDraft(body.locale);
    draft.clientSlug = client.id;
    draft.ads[0]!.imageHashes = [hash];
    draft.ads[0]!.titles = [body.headline];
    draft.ads[0]!.bodies = [body.body];
    const campaignName = `Estúdio Criativo — ${body.headline}`.slice(0, 120);
    draft.campaign.name = campaignName;

    const template = await campaignTemplate.save(
      campaignTemplate.create({
        tenantId: tenant.id,
        clientId: client.id,
        name: campaignName,
        payload: draft
      })
    );

    return NextResponse.json({ ok: true, hash, draftId: template.id });
  } catch (err) {
    const authResponse = apiErrorResponse(err, "creative-studio/commit");
    if (authResponse.status !== 500) return authResponse;
    console.error("[creative-studio/commit]", err);
    // "Meta" é termo de produto esperado aqui (é o Meta Ads) — mas nunca deixa passar
    // detalhe cru de infra interna (Postgres, TypeORM, etc.) direto pro usuário.
    const raw = err instanceof Error ? err.message : "";
    const message = /^A Meta /.test(raw) ? raw : "Falha ao enviar imagem pra Meta. Tenta de novo.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
