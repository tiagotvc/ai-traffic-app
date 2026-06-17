import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { CampaignDraftPayloadSchema } from "@/lib/campaign-draft";
import { getOrCreateClientMetaSettings } from "@/lib/client-meta-settings";
import { requireMetaPublishConfig } from "@/lib/client-publish-config";
import { createCampaignFromDraft, createFullMetaCampaign } from "@/lib/meta-campaign";

const LegacyBodySchema = z.object({
  clientId: z.string().min(1),
  adAccountId: z.string().min(1),
  campaignName: z.string().min(1),
  objective: z.enum(["leads", "sales", "traffic"]),
  dailyBudget: z.number().positive(),
  titles: z.array(z.string().min(1)).min(1),
  descriptions: z.array(z.string().min(1)).min(1),
  assetIds: z.array(z.string().min(1)).min(1),
  metaPageId: z.string().nullable().optional(),
  metaLinkUrl: z.string().nullable().optional(),
  metaPixelId: z.string().nullable().optional(),
  instagramActorId: z.string().nullable().optional(),
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

const DraftBodySchema = z.object({
  clientId: z.string().min(1),
  draft: CampaignDraftPayloadSchema,
  draftTemplateId: z.string().optional()
});

async function auditCreate(
  tenantId: string,
  clientId: string,
  body: unknown,
  result: unknown,
  success: boolean,
  errorMessage?: string
) {
  const { auditLog: auditRepo } = await repositories();
  await auditRepo.save(
    auditRepo.create({
      tenantId,
      clientId,
      kind: "META_CREATE_CAMPAIGN",
      success,
      errorMessage,
      request: body,
      response: success ? result : undefined
    })
  );
}

export async function POST(req: Request) {
  const { tenant, metaAccessToken } = await getAppContext();
  const raw = await req.json().catch(() => ({}));

  if (raw.draft) {
    const body = DraftBodySchema.parse(raw);
    const client = await getClientBySlugOrId(tenant.id, body.clientId);
    if (!client) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
    }
    if (!metaAccessToken) {
      return NextResponse.json({ ok: false, error: "Missing Meta access token" }, { status: 400 });
    }

    const draft = body.draft;
    const overridePage = draft.ad.pageId?.trim();
    const overrideLink = draft.ad.linkUrl?.trim();

    if (overrideLink && draft.ad.destinationType === "website") {
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
          message: "Selecione a Página Meta e a URL de destino (ou configure no perfil do cliente)."
        },
        { status: 400 }
      );
    }

    const settings = await getOrCreateClientMetaSettings(client.id);
    if (draft.ad.pixelId !== undefined) settings.metaPixelId = draft.ad.pixelId?.trim() || null;
    if (draft.ad.instagramActorId !== undefined) {
      settings.instagramActorId = draft.ad.instagramActorId?.trim() || null;
    }

    try {
      const result = await createCampaignFromDraft({
        accessToken: metaAccessToken,
        adAccountId: draft.adAccountId,
        draft,
        pageId: publish.metaPageId,
        linkUrl: publish.metaLinkUrl,
        settings,
        callToAction: settings.defaultCta
      });

      if (body.draftTemplateId) {
        const { campaignTemplate: repo } = await repositories();
        const template = await repo.findOne({
          where: { id: body.draftTemplateId, tenantId: tenant.id }
        });
        if (template) {
          template.payload = {
            ...draft,
            meta: { ...result, publishedAt: new Date().toISOString() }
          };
          await repo.save(template);
        }
      }

      await auditCreate(tenant.id, client.id, body, result, true);
      return NextResponse.json({ ok: true, ...result, publishSource: publish.source });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      await auditCreate(tenant.id, client.id, body, null, false, msg);
      return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
  }

  const body = LegacyBodySchema.parse(raw);
  const client = await getClientBySlugOrId(tenant.id, body.clientId);
  if (!client) {
    return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
  }

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
    return NextResponse.json({ ok: false, error: "Missing Meta access token" }, { status: 400 });
  }

  const settings = await getOrCreateClientMetaSettings(client.id);
  if (body.metaPixelId !== undefined) settings.metaPixelId = body.metaPixelId?.trim() || null;
  if (body.instagramActorId !== undefined) {
    settings.instagramActorId = body.instagramActorId?.trim() || null;
  }

  try {
    const result = await createFullMetaCampaign({
      accessToken: metaAccessToken,
      adAccountId: body.adAccountId,
      campaignName: body.campaignName,
      objective: body.objective,
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

    await auditCreate(tenant.id, client.id, body, result, true);
    return NextResponse.json({ ok: true, ...result, publishSource: publish.source });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await auditCreate(tenant.id, client.id, body, null, false, msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
