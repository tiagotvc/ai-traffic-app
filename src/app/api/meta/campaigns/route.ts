import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId, getMetaAccessTokenForAdAccount } from "@/lib/app-context";
import { CampaignDraftPayloadSchema } from "@/lib/campaign-draft";
import { getOrCreateClientMetaSettings } from "@/lib/client-meta-settings";
import { resolveAdPublishConfig, PublishConfigError } from "@/lib/client-publish-config";
import { createCampaignFromDraft, createFullMetaCampaign } from "@/lib/meta-campaign";
import { MetaCreativeValidationError } from "@/lib/meta-ad-creative";
import { formatMetaGraphError } from "@/lib/meta-error";
import { PersonaTargetingInvalidError } from "@/lib/meta-targeting-prune";
import { isPersonaTargetingPublishError } from "@/lib/persona-targeting-audit";

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
  const { tenant, user, metaAccessToken } = await getAppContext();
  const raw = await req.json().catch(() => ({}));

  if (raw.draft) {
    const body = DraftBodySchema.parse(raw);
    const client = await getClientBySlugOrId(tenant.id, body.clientId);
    if (!client) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    const draft = body.draft;
    const token =
      (await getMetaAccessTokenForAdAccount(tenant.id, user.id, draft.adAccountId)) ??
      metaAccessToken;
    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error: "META_PERMISSION",
          message:
            "Sem acesso à conta de anúncios. Reconecte em Configurações → Reconectar Meta e selecione esta conta no diálogo da Meta."
        },
        { status: 403 }
      );
    }
    const primaryAd = draft.ads[0];
    if (!primaryAd) {
      return NextResponse.json({ ok: false, error: "Rascunho sem anúncios" }, { status: 400 });
    }
    let publish;
    try {
      publish = resolveAdPublishConfig({
        client,
        pageId: primaryAd.pageId,
        linkUrl: primaryAd.linkUrl,
        destinationType: primaryAd.destinationType
      });
    } catch (err) {
      if (err instanceof PublishConfigError) {
        return NextResponse.json(
          { ok: false, error: err.code, message: err.message },
          { status: 400 }
        );
      }
      return NextResponse.json(
        {
          ok: false,
          error: "CLIENT_PUBLISH_CONFIG_REQUIRED",
          message: "Selecione a Página Meta (ou configure no perfil do cliente)."
        },
        { status: 400 }
      );
    }

    const settings = await getOrCreateClientMetaSettings(client.id);
    if (primaryAd.pixelId !== undefined) settings.metaPixelId = primaryAd.pixelId?.trim() || null;
    if (primaryAd.instagramActorId !== undefined) {
      settings.instagramActorId = primaryAd.instagramActorId?.trim() || null;
    }

    try {
      const result = await createCampaignFromDraft({
        accessToken: token,
        adAccountId: draft.adAccountId,
        draft,
        pageId: publish.metaPageId,
        linkUrl: publish.metaLinkUrl ?? "",
        settings,
        callToAction: settings.defaultCta,
        tenantId: tenant.id,
        userId: user?.id
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
      const code = err instanceof MetaCreativeValidationError ? err.code : undefined;
      const targetingInvalid =
        err instanceof PersonaTargetingInvalidError || isPersonaTargetingPublishError(err);
      const msg =
        code != null
          ? err instanceof Error
            ? err.message
            : "Unknown error"
          : formatMetaGraphError(err);
      await auditCreate(tenant.id, client.id, body, null, false, msg);
      return NextResponse.json(
        {
          ok: false,
          error: code ?? msg,
          message: code ?? msg,
          errorCode: targetingInvalid ? "TARGETING_INVALID" : code
        },
        { status: targetingInvalid ? 400 : code ? 400 : 500 }
      );
    }
  }

  const body = LegacyBodySchema.parse(raw);
  const client = await getClientBySlugOrId(tenant.id, body.clientId);
  if (!client) {
    return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
  }

  let publish;
  try {
    publish = resolveAdPublishConfig({
      client,
      pageId: body.metaPageId,
      linkUrl: body.metaLinkUrl,
      destinationType: body.metaLinkUrl?.trim() ? "website" : undefined
    });
  } catch (err) {
    if (err instanceof PublishConfigError) {
      return NextResponse.json(
        { ok: false, error: err.code, message: err.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        ok: false,
        error: "CLIENT_PUBLISH_CONFIG_REQUIRED",
        message: "Selecione a Página Meta (ou configure no perfil do cliente)."
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
      linkUrl: publish.metaLinkUrl ?? "",
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
