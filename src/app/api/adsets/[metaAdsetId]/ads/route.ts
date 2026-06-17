import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { AdDraftItemSchema } from "@/lib/campaign-draft";
import { getOrCreateClientMetaSettings } from "@/lib/client-meta-settings";
import { requireMetaPublishConfig } from "@/lib/client-publish-config";
import { publishAdToAdset } from "@/lib/meta-campaign";
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
    publish = requireMetaPublishConfig({
      metaPageId: body.ad.pageId || client.metaPageId,
      metaLinkUrl: body.ad.linkUrl || client.metaLinkUrl
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "CLIENT_PUBLISH_CONFIG_REQUIRED",
        message: "Configure página e URL de destino do cliente."
      },
      { status: 400 }
    );
  }

  const adsetDetail = await fetchAdSetDetail(metaAccessToken, metaAdsetId);
  const settings = await getOrCreateClientMetaSettings(client.id);

  try {
    const result = await publishAdToAdset({
      accessToken: metaAccessToken,
      adAccountId: body.adAccountId,
      adsetId: metaAdsetId,
      ad: body.ad,
      adset: {
        id: metaAdsetId,
        name: adsetDetail.name ?? "Conjunto",
        conversionLocation: "website_and_form",
        dynamicCreative: true,
        schedule: { start: null, end: null },
        targeting: {
          locations: [],
          ageMin: 18,
          ageMax: 65,
          gender: "all",
          interests: [],
          locales: [],
          customAudienceIds: [],
          excludedAudienceIds: []
        },
        placements: "advantage_plus"
      },
      objective: body.objective,
      pageId: publish.metaPageId,
      linkUrl: publish.metaLinkUrl,
      settings,
      callToAction: settings.defaultCta,
      campaignName: body.campaignName
    });

    return NextResponse.json({ ok: true, ...result, adsetId: metaAdsetId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
