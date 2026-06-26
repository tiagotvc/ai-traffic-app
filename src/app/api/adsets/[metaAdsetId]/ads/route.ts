import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { AdDraftItemSchema } from "@/lib/campaign-draft";
import { defaultPlacements } from "@/lib/campaign-placements";
import { getOrCreateClientMetaSettings } from "@/lib/client-meta-settings";
import { resolveAdPublishConfig, PublishConfigError } from "@/lib/client-publish-config";
import { publishAdToAdset } from "@/lib/meta-campaign";
import { MetaCreativeValidationError } from "@/lib/meta-ad-creative";
import { extractInheritedAdsetFromMeta } from "@/lib/meta-adset-import";
import { fetchAdSetDetail } from "@/lib/meta-graph";

const BodySchema = z.object({
  clientId: z.string().min(1),
  adAccountId: z.string().min(1),
  objective: z.enum(["awareness", "traffic", "engagement", "leads", "app", "sales"]),
  ad: AdDraftItemSchema,
  campaignName: z.string().optional()
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ metaAdsetId: string }> }
) {
  const { tenant, metaAccessToken } = await getAppContext();
  if (!metaAccessToken) {
    return NextResponse.json({ ok: false, error: "Missing Meta access token" }, { status: 400 });
  }

  const { metaAdsetId } = await ctx.params;
  const body = BodySchema.parse(await req.json().catch(() => ({})));
  const client = await getClientBySlugOrId(tenant.id, body.clientId);
  if (!client) {
    return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
  }

  const { adAccount: adAccountRepo } = await repositories();
  const linked = await adAccountRepo.findOne({
    where: { clientId: client.id, metaAdAccountId: body.adAccountId }
  });
  if (!linked) {
    return NextResponse.json({ ok: false, error: "Conta não vinculada ao cliente" }, { status: 403 });
  }

  let publish;
  try {
    publish = resolveAdPublishConfig({
      client,
      pageId: body.ad.pageId,
      linkUrl: body.ad.linkUrl,
      destinationType: body.ad.destinationType
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

  const adsetDetail = await fetchAdSetDetail(metaAccessToken, metaAdsetId);
  const settings = await getOrCreateClientMetaSettings(client.id);

  try {
    const inheritedAdset = extractInheritedAdsetFromMeta(adsetDetail, adsetDetail.name ?? "Conjunto");
    const result = await publishAdToAdset({
      accessToken: metaAccessToken,
      adAccountId: body.adAccountId,
      adsetId: metaAdsetId,
      ad: body.ad,
      adset: {
        id: metaAdsetId,
        ...inheritedAdset,
        placements: inheritedAdset.placements ?? defaultPlacements()
      } as import("@/lib/campaign-draft").AdSetDraftItem,
      objective: body.objective,
      pageId: publish.metaPageId,
      linkUrl: publish.metaLinkUrl,
      settings,
      callToAction: settings.defaultCta,
      campaignName: body.campaignName
    });

    return NextResponse.json({ ok: true, ...result, adsetId: metaAdsetId });
  } catch (err) {
    const code = err instanceof MetaCreativeValidationError ? err.code : undefined;
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: code ?? msg, message: code ?? msg },
      { status: code ? 400 : 500 }
    );
  }
}
