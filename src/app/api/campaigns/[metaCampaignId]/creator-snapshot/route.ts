import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import type { CampaignDraftPayload, DraftTargeting } from "@/lib/campaign-draft";
import { defaultCampaignDraft } from "@/lib/campaign-draft";
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

export async function GET(
  req: Request,
  ctx: { params: Promise<{ metaCampaignId: string }> }
) {
  const { tenant, user, metaAccessToken } = await getAppContext();
  const { metaCampaignId } = await ctx.params;
  const token = metaAccessToken ?? (await getTenantMetaAccessToken(tenant.id, user.id));
  if (!token) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  try {
    const campaign = await fetchCampaign(token, metaCampaignId);
    const adsets = await fetchAdSetsForCampaign(token, metaCampaignId);
    const firstAdset = adsets[0];
    if (!firstAdset) {
      return NextResponse.json({ ok: false, error: "Campanha sem conjuntos" }, { status: 404 });
    }

    const adsetDetail = await fetchAdSetDetail(token, firstAdset.id);
    const ads = await fetchAdsForAdSet(token, firstAdset.id);
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
      : firstAdset.daily_budget
        ? Number(firstAdset.daily_budget) / 100
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
          name: firstAdset.name ?? "Conjunto importado",
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

    return NextResponse.json({ ok: true, patch });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao importar campanha";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
