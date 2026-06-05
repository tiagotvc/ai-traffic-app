import type { ClientMetaSettings } from "@/db/entities/ClientMetaSettings";
import { buildTargetingFromSettings } from "@/lib/client-meta-settings";
import { metaPost } from "@/lib/meta-graph";

export type CampaignObjectiveKey = "leads" | "sales" | "traffic";

const OBJECTIVE_MAP: Record<CampaignObjectiveKey, string> = {
  leads: "OUTCOME_LEADS",
  sales: "OUTCOME_SALES",
  traffic: "OUTCOME_TRAFFIC"
};

const OPTIMIZATION_MAP: Record<CampaignObjectiveKey, string> = {
  leads: "LEAD_GENERATION",
  sales: "OFFSITE_CONVERSIONS",
  traffic: "LINK_CLICKS"
};

/** Segmentação escolhida na criação do anúncio (sobrescreve os defaults do cliente). */
export type CampaignTargetingInput = {
  countries?: string[];
  cities?: { key: string; radius?: number; distanceUnit?: "mile" | "kilometer" }[];
  ageMin?: number;
  ageMax?: number;
  /** [1] = masculino, [2] = feminino; omitido/vazio = todos. */
  genders?: number[];
  locales?: number[];
  interests?: { id: string; name?: string }[];
  customAudienceIds?: string[];
  excludedAudienceIds?: string[];
};

export type CreateFullCampaignInput = {
  accessToken: string;
  adAccountId: string;
  campaignName: string;
  objective: CampaignObjectiveKey;
  dailyBudgetBRL: number;
  titles: string[];
  descriptions: string[];
  imageHashes: string[];
  pageId: string;
  linkUrl: string;
  settings?: ClientMetaSettings;
  callToAction?: string;
  targeting?: CampaignTargetingInput;
};

function buildTargetingFromInput(t: CampaignTargetingInput): Record<string, unknown> {
  const geo: Record<string, unknown> = {};
  if (t.countries?.length) geo.countries = t.countries;
  if (t.cities?.length) {
    geo.cities = t.cities.map((c) => ({
      key: c.key,
      radius: c.radius ?? 10,
      distance_unit: c.distanceUnit ?? "kilometer"
    }));
  }
  const targeting: Record<string, unknown> = {
    geo_locations: Object.keys(geo).length ? geo : { countries: ["BR"] },
    age_min: t.ageMin ?? 18,
    age_max: t.ageMax ?? 65
  };
  if (t.genders?.length) targeting.genders = t.genders;
  if (t.locales?.length) targeting.locales = t.locales;
  if (t.interests?.length) {
    targeting.flexible_spec = [{ interests: t.interests.map((i) => ({ id: i.id, name: i.name })) }];
  }
  if (t.customAudienceIds?.length) {
    targeting.custom_audiences = t.customAudienceIds.map((id) => ({ id }));
  }
  if (t.excludedAudienceIds?.length) {
    targeting.excluded_custom_audiences = t.excludedAudienceIds.map((id) => ({ id }));
  }
  return targeting;
}

export type CreateFullCampaignResult = {
  campaignId: string;
  adsetId: string;
  creativeId: string;
  adId: string;
};

function normalizeAdAccountId(id: string) {
  return id.startsWith("act_") ? id : `act_${id}`;
}

export async function createFullMetaCampaign(
  input: CreateFullCampaignInput
): Promise<CreateFullCampaignResult> {
  const actId = normalizeAdAccountId(input.adAccountId);
  const token = input.accessToken;
  const dailyBudgetMinor = Math.max(100, Math.round(input.dailyBudgetBRL * 100));
  const settings = input.settings;
  const objective = input.objective;
  const cta = input.callToAction ?? settings?.defaultCta ?? "LEARN_MORE";
  const prefix = settings?.campaignNamePrefix?.trim();
  const campaignName = prefix ? `${prefix} ${input.campaignName}` : input.campaignName;
  const specialCategories = settings?.specialAdCategories?.length
    ? JSON.stringify(settings.specialAdCategories)
    : "[]";

  const campaign = await metaPost<{ id: string }>(`/${actId}/campaigns`, token, {
    name: campaignName,
    objective: OBJECTIVE_MAP[objective],
    status: "PAUSED",
    special_ad_categories: specialCategories,
    is_adset_budget_sharing_enabled: "false"
  });

  const startTime = Math.floor(Date.now() / 1000) + 3600;
  const targeting = input.targeting
    ? buildTargetingFromInput(input.targeting)
    : settings
      ? buildTargetingFromSettings(settings)
      : {
          geo_locations: { countries: ["BR"] },
          age_min: 18,
          age_max: 65
        };

  const adsetBody: Record<string, string> = {
    name: `${campaignName} — Ad Set`,
    campaign_id: campaign.id,
    daily_budget: String(dailyBudgetMinor),
    billing_event: "IMPRESSIONS",
    optimization_goal: OPTIMIZATION_MAP[objective],
    bid_strategy: "LOWEST_COST_WITHOUT_CAP",
    targeting: JSON.stringify(targeting),
    status: "PAUSED",
    start_time: String(startTime)
  };

  if (objective === "leads") {
    const promoted: Record<string, string> = { page_id: input.pageId };
    if (settings?.metaLeadFormId) promoted.lead_gen_form_id = settings.metaLeadFormId;
    adsetBody.promoted_object = JSON.stringify(promoted);
  }

  if (objective === "sales" && settings?.metaPixelId) {
    adsetBody.promoted_object = JSON.stringify({
      pixel_id: settings.metaPixelId,
      custom_event_type: "PURCHASE"
    });
  }

  const adset = await metaPost<{ id: string }>(`/${actId}/adsets`, token, adsetBody);

  const assetFeedSpec: Record<string, unknown> = {
    images: input.imageHashes.map((hash) => ({ hash })),
    titles: input.titles.map((text) => ({ text })),
    bodies: input.descriptions.map((text) => ({ text })),
    link_urls: [{ website_url: input.linkUrl }],
    call_to_action_types: [cta]
  };

  const objectStory: Record<string, unknown> = { page_id: input.pageId };
  if (settings?.instagramActorId) {
    objectStory.instagram_actor_id = settings.instagramActorId;
  }

  const creative = await metaPost<{ id: string }>(`/${actId}/adcreatives`, token, {
    name: `${campaignName} — Creative`,
    object_story_spec: JSON.stringify(objectStory),
    asset_feed_spec: JSON.stringify(assetFeedSpec)
  });

  const ad = await metaPost<{ id: string }>(`/${actId}/ads`, token, {
    name: `${campaignName} — Ad`,
    adset_id: adset.id,
    creative: JSON.stringify({ creative_id: creative.id }),
    status: "PAUSED"
  });

  return {
    campaignId: campaign.id,
    adsetId: adset.id,
    creativeId: creative.id,
    adId: ad.id
  };
}
