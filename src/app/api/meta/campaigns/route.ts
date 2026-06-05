import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { getOrCreateClientMetaSettings } from "@/lib/client-meta-settings";
import { requireMetaPublishConfig } from "@/lib/client-publish-config";
import { createFullMetaCampaign, type CampaignObjectiveKey } from "@/lib/meta-campaign";

const BodySchema = z.object({
  clientId: z.string().min(1),
  adAccountId: z.string().min(1),
  campaignName: z.string().min(1),
  objective: z.enum(["leads", "sales", "traffic"]),
  dailyBudget: z.number().positive(),
  titles: z.array(z.string().min(1)).min(1),
  descriptions: z.array(z.string().min(1)).min(1),
  assetIds: z.array(z.string().min(1)).min(1),
  // Overrides escolhidos na criação do anúncio (por conta de anúncio).
  metaPageId: z.string().nullable().optional(),
  metaLinkUrl: z.string().nullable().optional(),
  metaPixelId: z.string().nullable().optional(),
  instagramActorId: z.string().nullable().optional(),
  // Segmentação (Público) escolhida no criador — sobrescreve os defaults do cliente.
  targeting: z
    .object({
      countries: z.array(z.string()).optional(),
      cities: z
        .array(
          z.object({
            key: z.string(),
            radius: z.number().optional(),
            distanceUnit: z.enum(["mile", "kilometer"]).optional()
          })
        )
        .optional(),
      ageMin: z.number().min(13).max(65).optional(),
      ageMax: z.number().min(13).max(65).optional(),
      genders: z.array(z.number()).optional(),
      locales: z.array(z.number()).optional(),
      interests: z.array(z.object({ id: z.string(), name: z.string().optional() })).optional(),
      customAudienceIds: z.array(z.string()).optional(),
      excludedAudienceIds: z.array(z.string()).optional()
    })
    .optional()
});

export async function POST(req: Request) {
  const { tenant, metaAccessToken } = await getAppContext();
  const body = BodySchema.parse(await req.json().catch(() => ({})));

  const client = await getClientBySlugOrId(tenant.id, body.clientId);
  if (!client) {
    return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
  }

  // Página e URL: usa o que foi escolhido na criação do anúncio; senão cai no
  // cliente/env. Pixel e Instagram idem (sobrescrevem as settings do cliente).
  const overridePage = body.metaPageId?.trim();
  const overrideLink = body.metaLinkUrl?.trim();

  if (overrideLink) {
    try {
      new URL(overrideLink);
    } catch {
      return NextResponse.json({ ok: false, error: "URL de destino inválida" }, { status: 400 });
    }
  }

  let publish;
  try {
    publish = requireMetaPublishConfig({
      metaPageId: overridePage || client.metaPageId,
      metaLinkUrl: overrideLink || client.metaLinkUrl
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "CLIENT_PUBLISH_CONFIG_REQUIRED",
        message:
          "Selecione a Página Meta e a URL de destino do anúncio (ou configure no perfil do cliente)."
      },
      { status: 400 }
    );
  }

  if (!metaAccessToken) {
    return NextResponse.json(
      { ok: false, error: "Missing Meta access token" },
      { status: 400 }
    );
  }

  const { auditLog: auditRepo } = await repositories();

  const settings = await getOrCreateClientMetaSettings(client.id);
  // Overrides por anúncio (não persistidos — valem só para esta publicação).
  if (body.metaPixelId !== undefined) {
    settings.metaPixelId = body.metaPixelId?.trim() || null;
  }
  if (body.instagramActorId !== undefined) {
    settings.instagramActorId = body.instagramActorId?.trim() || null;
  }

  try {
    const result = await createFullMetaCampaign({
      accessToken: metaAccessToken,
      adAccountId: body.adAccountId,
      campaignName: body.campaignName,
      objective: body.objective as CampaignObjectiveKey,
      dailyBudgetBRL: body.dailyBudget,
      titles: body.titles,
      descriptions: body.descriptions,
      imageHashes: body.assetIds,
      pageId: publish.metaPageId,
      linkUrl: publish.metaLinkUrl,
      settings,
      callToAction: settings.defaultCta,
      targeting: body.targeting
    });

    await auditRepo.save(
      auditRepo.create({
        tenantId: tenant.id,
        clientId: client.id,
        kind: "META_CREATE_CAMPAIGN",
        success: true,
        request: body,
        response: result
      })
    );

    return NextResponse.json({
      ok: true,
      ...result,
      publishSource: publish.source
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await auditRepo.save(
      auditRepo.create({
        tenantId: tenant.id,
        clientId: client.id,
        kind: "META_CREATE_CAMPAIGN",
        success: false,
        errorMessage: msg,
        request: body
      })
    );
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
