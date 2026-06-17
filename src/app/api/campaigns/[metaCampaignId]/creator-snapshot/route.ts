import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext, slugify } from "@/lib/app-context";
import type { CampaignDraftPayload, DraftTargeting } from "@/lib/campaign-draft";
import { defaultCampaignDraft } from "@/lib/campaign-draft";
import { getResolvedClientMeta } from "@/lib/client-meta-settings";
import {
  fetchAdSetDetail,
  fetchAdSetsForCampaign,
  fetchAdWithCreative,
  fetchAdsForAdSet,
  fetchCampaign
} from "@/lib/meta-graph";
import { getTenantMetaAccessToken } from "@/lib/meta-auth-store";

const OBJECTIVE_REVERSE: Record<string, CampaignDraftPayload["objective"]> = {
  OUTCOME_AWARENESS: "awareness",
  OUTCOME_TRAFFIC: "traffic",
  OUTCOME_ENGAGEMENT: "engagement",
  OUTCOME_LEADS: "leads",
  OUTCOME_APP_PROMOTION: "app",
  OUTCOME_SALES: "sales",
  BRAND_AWARENESS: "awareness",
  LINK_CLICKS: "traffic",
  POST_ENGAGEMENT: "engagement",
  LEAD_GENERATION: "leads",
  APP_INSTALLS: "app",
  CONVERSIONS: "sales"
};

function mapGeoToLocations(targeting?: Record<string, unknown>): DraftTargeting["locations"] {
  const geo = targeting?.geo_locations as Record<string, unknown> | undefined;
  if (!geo) return [];
  const out: DraftTargeting["locations"] = [];
  const countries = geo.countries as string[] | undefined;
  if (countries?.length) {
    for (const c of countries) {
      out.push({ value: c, label: c, meta: { type: "country", countryCode: c } });
    }
  }
  const cities = geo.cities as Array<{
    key: string;
    radius?: number;
    distance_unit?: string;
  }> | undefined;
  if (cities?.length) {
    for (const city of cities) {
      out.push({
        value: city.key,
        label: city.key,
        meta: {
          type: "city",
          radius: city.radius ?? 10,
          distanceUnit: city.distance_unit === "mile" ? "mile" : "kilometer"
        }
      });
    }
  }
  return out;
}

async function resolveCampaignClientContext(
  tenantId: string,
  metaCampaignId: string
): Promise<{
  metaAdAccountId: string;
  clientSlug: string;
  clientId: string;
} | null> {
  const { campaignMetricSnapshot: campRepo, adAccount: adRepo, client: clientRepo } =
    await repositories();
  const snap = await campRepo.findOne({
    where: { metaCampaignId },
    order: { day: "DESC" }
  });
  if (!snap) return null;
  const acc = await adRepo.findOne({ where: { id: snap.adAccountId } });
  if (!acc) return null;
  const client = await clientRepo.findOne({ where: { id: acc.clientId } });
  if (!client || client.tenantId !== tenantId) return null;
  return { metaAdAccountId: acc.metaAdAccountId, clientSlug: slugify(client.name) || client.id, clientId: client.id };
}

async function resolveAdAccountMetaId(
  tenantId: string,
  metaCampaignId: string
): Promise<string | null> {
  const ctx = await resolveCampaignClientContext(tenantId, metaCampaignId);
  return ctx?.metaAdAccountId ?? null;
}

type CreativeSnapshot = Awaited<ReturnType<typeof fetchAdWithCreative>>;

function extractInheritedAdDefaults(
  creativeData: CreativeSnapshot | null,
  fallback: {
    pageId?: string | null;
    linkUrl?: string | null;
    instagramActorId?: string | null;
    pixelId?: string | null;
    leadFormId?: string | null;
  }
) {
  const feed = creativeData?.creative?.asset_feed_spec;
  const story = creativeData?.creative?.object_story_spec as Record<string, unknown> | undefined;
  const linkData = story?.link_data as Record<string, unknown> | undefined;
  const pageId = String(story?.page_id ?? fallback.pageId ?? "");
  const instagramActorId =
    (story?.instagram_actor_id as string | undefined) ?? fallback.instagramActorId ?? null;
  const linkUrl =
    feed?.link_urls?.[0]?.website_url ||
    (typeof linkData?.link === "string" ? linkData.link : "") ||
    fallback.linkUrl ||
    "";
  const leadFormId =
    (linkData?.lead_gen_form_id as string | undefined) ?? fallback.leadFormId ?? null;
  const destinationType = leadFormId ? ("instant_form" as const) : ("website" as const);

  return {
    pageId,
    instagramActorId,
    pixelId: fallback.pixelId ?? null,
    linkUrl,
    leadFormId,
    destinationType,
    urlParams: "",
    tracking: { websiteEvents: false, appEvents: false, offlineEvents: false }
  };
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ metaCampaignId: string }> }
) {
  const { tenant, user, metaAccessToken } = await getAppContext();
  const { metaCampaignId } = await ctx.params;
  const url = new URL(req.url);
  const adsetParam = url.searchParams.get("adset");
  const mode = url.searchParams.get("mode");
  const token = metaAccessToken ?? (await getTenantMetaAccessToken(tenant.id, user.id));
  if (!token) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  try {
    const campaign = await fetchCampaign(token, metaCampaignId);
    const clientCtx = await resolveCampaignClientContext(tenant.id, metaCampaignId);
    const adAccountId = clientCtx?.metaAdAccountId ?? null;
    const adsets = await fetchAdSetsForCampaign(token, metaCampaignId);
    const selectedAdset =
      (adsetParam ? adsets.find((a) => a.id === adsetParam) : null) ?? adsets[0];
    if (!selectedAdset) {
      return NextResponse.json({ ok: false, error: "Campanha sem conjuntos" }, { status: 404 });
    }

    if (mode === "add-ad") {
      const ads = await fetchAdsForAdSet(token, selectedAdset.id);
      const firstAd = ads[0];
      let creativeData: CreativeSnapshot | null = null;
      if (firstAd?.id) {
        try {
          creativeData = await fetchAdWithCreative(token, firstAd.id);
        } catch {
          /* optional */
        }
      }

      const resolvedMeta = clientCtx
        ? await getResolvedClientMeta(tenant.id, clientCtx.clientSlug)
        : null;
      const inheritedAd = extractInheritedAdDefaults(creativeData, {
        pageId: resolvedMeta?.publish.pageId,
        linkUrl: resolvedMeta?.publish.linkUrl,
        instagramActorId: resolvedMeta?.settings.instagramActorId,
        pixelId: resolvedMeta?.settings.metaPixelId,
        leadFormId: resolvedMeta?.settings.metaLeadFormId
      });

      const objective =
        OBJECTIVE_REVERSE[campaign.objective ?? ""] ?? defaultCampaignDraft("pt-BR").objective;
      const dailyBudgetBRL = campaign.daily_budget
        ? Number(campaign.daily_budget) / 100
        : selectedAdset.daily_budget
          ? Number(selectedAdset.daily_budget) / 100
          : 150;

      const patch: Partial<CampaignDraftPayload> = {
        objective,
        campaign: {
          name: campaign.name ?? "",
          budgetLevel: campaign.daily_budget ? "campaign" : "adset",
          dailyBudgetBRL,
          bidStrategy: "lowest_cost",
          specialAdCategories: [],
          abTestEnabled: false
        },
        copyFromCampaignEnabled: false,
        copyFromCampaignId: null
      };

      return NextResponse.json({
        ok: true,
        patch,
        adAccountId,
        clientSlug: clientCtx?.clientSlug,
        adsetName: selectedAdset.name ?? "Conjunto",
        inheritedAd
      });
    }

    const adsetDetail = await fetchAdSetDetail(token, selectedAdset.id);
    const ads = await fetchAdsForAdSet(token, selectedAdset.id);
    const firstAd = ads[0];
    let creativeData: Awaited<ReturnType<typeof fetchAdWithCreative>> | null = null;
    if (firstAd?.id) {
      try {
        creativeData = await fetchAdWithCreative(token, firstAd.id);
      } catch {
        /* optional */
      }
    }

    const targeting = adsetDetail.targeting;
    const ageMin = Number(targeting?.age_min) || 18;
    const ageMax = Number(targeting?.age_max) || 65;
    const genders = targeting?.genders as number[] | undefined;
    let gender: DraftTargeting["gender"] = "all";
    if (genders?.length === 1) gender = genders[0] === 1 ? "male" : "female";

    const feed = creativeData?.creative?.asset_feed_spec;
    const titles =
      feed?.titles?.map((t) => t.text).filter(Boolean) ??
      (creativeData?.creative?.title ? [creativeData.creative.title] : []);
    const bodies =
      feed?.bodies?.map((b) => b.text).filter(Boolean) ??
      (creativeData?.creative?.body ? [creativeData.creative.body] : []);
    const imageHashes = feed?.images?.map((i) => i.hash).filter(Boolean) as string[] | undefined;
    const linkUrl = feed?.link_urls?.[0]?.website_url ?? "";

    const story = creativeData?.creative?.object_story_spec as
      | { page_id?: string; instagram_actor_id?: string }
      | undefined;
    const pageId = story?.page_id ?? "";

    const objective =
      OBJECTIVE_REVERSE[campaign.objective ?? ""] ?? defaultCampaignDraft("pt-BR").objective;
    const dailyBudgetBRL = campaign.daily_budget
      ? Number(campaign.daily_budget) / 100
      : selectedAdset.daily_budget
        ? Number(selectedAdset.daily_budget) / 100
        : 150;

    const patch: Partial<CampaignDraftPayload> = {
      objective,
      campaign: {
        name: campaign.name ?? "",
        budgetLevel: campaign.daily_budget ? "campaign" : "adset",
        dailyBudgetBRL,
        bidStrategy: "lowest_cost",
        specialAdCategories: [],
        abTestEnabled: false
      },
      adsets: [
        {
          id: `imported_adset_${Date.now()}`,
          name: selectedAdset.name ?? "Conjunto importado",
          conversionLocation: "website_and_form",
          dynamicCreative: true,
          schedule: { start: null, end: null },
          targeting: {
            locations: mapGeoToLocations(targeting),
            ageMin,
            ageMax,
            gender,
            interests: [],
            locales: [],
            customAudienceIds: [],
            excludedAudienceIds: []
          },
          placements: "advantage_plus"
        }
      ],
      ads: [
        {
          id: `imported_ad_${Date.now()}`,
          name: firstAd?.name ?? "Anúncio importado",
          pageId,
          instagramActorId: story?.instagram_actor_id ?? null,
          pixelId: null,
          format: "single_image",
          imageHashes: imageHashes ?? [],
          titles: titles as string[],
          bodies: bodies as string[],
          destinationType: "website",
          linkUrl,
          leadFormId: null,
          urlParams: "",
          targetAdsetIds: ["__all__"],
          tracking: { websiteEvents: false, appEvents: false, offlineEvents: false }
        }
      ],
      copyFromCampaignId: metaCampaignId
    };

    return NextResponse.json({ ok: true, patch, adAccountId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao importar campanha";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
