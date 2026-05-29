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
  assetIds: z.array(z.string().min(1)).min(1)
});

export async function POST(req: Request) {
  const { tenant, metaAccessToken } = await getAppContext();
  const body = BodySchema.parse(await req.json().catch(() => ({})));

  const client = await getClientBySlugOrId(tenant.id, body.clientId);
  if (!client) {
    return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
  }

  let publish;
  try {
    publish = requireMetaPublishConfig(client);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "CLIENT_PUBLISH_CONFIG_REQUIRED",
        message:
          "Configure a Página Meta e a URL de destino nas configurações do cliente antes de publicar."
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
      callToAction: settings.defaultCta
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
