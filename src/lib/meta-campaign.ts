import type { ClientMetaSettings } from "@/db/entities/ClientMetaSettings";
import type { CampaignDraftPayload } from "@/lib/campaign-draft";
import { draftTargetingToApi } from "@/lib/campaign-draft";
import { buildTargetingFromSettings } from "@/lib/client-meta-settings";
import { metaPost } from "@/lib/meta-graph";

export type CampaignObjectiveKey =
  | "awareness"
  | "traffic"
  | "engagement"
  | "leads"
  | "app"
  | "sales";

const OBJECTIVE_MAP: Record<CampaignObjectiveKey, string> = {
  awareness: "OUTCOME_AWARENESS",
  traffic: "OUTCOME_TRAFFIC",
  engagement: "OUTCOME_ENGAGEMENT",
  leads: "OUTCOME_LEADS",
  app: "OUTCOME_APP_PROMOTION",
  sales: "OUTCOME_SALES"
};

const OPTIMIZATION_MAP: Record<CampaignObjectiveKey, string> = {
  awareness: "REACH",
  traffic: "LINK_CLICKS",
  engagement: "POST_ENGAGEMENT",
  leads: "LEAD_GENERATION",
  sales: "OFFSITE_CONVERSIONS",
  app: "APP_INSTALLS"
};

export type LegacyObjectiveKey = "leads" | "sales" | "traffic";

export type CampaignTargetingInput = {
  countries?: string[];
  cities?: { key: string; radius?: number; distanceUnit?: "mile" | "kilometer" }[];
  ageMin?: number;
  ageMax?: number;
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
  objective: CampaignObjectiveKey | LegacyObjectiveKey;
  dailyBudgetBRL: number;
  budgetLevel?: "campaign" | "adset";
  titles: string[];
  descriptions: string[];
  imageHashes: string[];
  pageId: string;
  linkUrl: string;
  settings?: ClientMetaSettings;
  callToAction?: string;
  targeting?: CampaignTargetingInput;
  adsetName?: string;
  adName?: string;
  scheduleStart?: string | null;
  scheduleEnd?: string | null;
  leadFormId?: string | null;
  destinationType?: "website" | "instant_form";
  instagramActorId?: string | null;
  pixelId?: string | null;
  specialAdCategories?: string[];
};

export type CreateCampaignFromDraftInput = {
  accessToken: string;
  adAccountId: string;
  draft: CampaignDraftPayload;
  pageId: string;
  linkUrl: string;
  settings?: ClientMetaSettings;
  callToAction?: string;
};

export type CreateFullCampaignResult = {
  campaignId: string;
  adsetId: string;
  creativeId: string;
  adId: string;
};

function normalizeAdAccountId(id: string) {
  return id.startsWith("act_") ? id : `act_${id}`;
}

function normalizeObjective(obj: CampaignObjectiveKey | LegacyObjectiveKey): CampaignObjectiveKey {
  if (obj === "leads" || obj === "sales" || obj === "traffic") return obj;
  return obj as CampaignObjectiveKey;
}

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

function parseScheduleTime(iso: string | null | undefined, fallbackOffsetSec: number): number {
  if (iso) {
    const ms = Date.parse(iso);
    if (!Number.isNaN(ms)) return Math.floor(ms / 1000);
  }
  return Math.floor(Date.now() / 1000) + fallbackOffsetSec;
}

export async function createCampaignFromDraft(
  input: CreateCampaignFromDraftInput
): Promise<CreateFullCampaignResult> {
  const { draft } = input;
  const actId = normalizeAdAccountId(input.adAccountId);
  const token = input.accessToken;
  const objective = draft.objective;
  const dailyBudgetMinor = Math.max(100, Math.round(draft.campaign.dailyBudgetBRL * 100));
  const settings = input.settings;
  const cta = input.callToAction ?? settings?.defaultCta ?? "LEARN_MORE";
  const prefix = settings?.campaignNamePrefix?.trim();
  const campaignName = prefix ? `${prefix} ${draft.campaign.name}` : draft.campaign.name;
  const adsetName = draft.adset.name.trim() || `${campaignName} — Ad Set`;
  const adName = draft.ad.name.trim() || `${campaignName} — Ad`;

  const specialCategories =
    draft.campaign.specialAdCategories.length > 0
      ? JSON.stringify(draft.campaign.specialAdCategories)
      : settings?.specialAdCategories?.length
        ? JSON.stringify(settings.specialAdCategories)
        : "[]";

  const isCbo = draft.campaign.budgetLevel === "campaign";

  const campaignBody: Record<string, string> = {
    name: campaignName,
    objective: OBJECTIVE_MAP[objective],
    status: "PAUSED",
    special_ad_categories: specialCategories,
    is_adset_budget_sharing_enabled: isCbo ? "true" : "false"
  };
  if (isCbo) campaignBody.daily_budget = String(dailyBudgetMinor);

  const campaign = await metaPost<{ id: string }>(`/${actId}/campaigns`, token, campaignBody);

  const startTime = parseScheduleTime(draft.adset.schedule.start, 3600);
  const targetingApi = draftTargetingToApi(draft.adset.targeting);
  const targeting = Object.keys(targetingApi).length
    ? buildTargetingFromInput(targetingApi)
    : settings
      ? buildTargetingFromSettings(settings)
      : { geo_locations: { countries: ["BR"] }, age_min: 18, age_max: 65 };

  const pageId = draft.ad.pageId || input.pageId;
  const instagramId = draft.ad.instagramActorId ?? settings?.instagramActorId ?? null;
  const pixelId = draft.ad.pixelId ?? settings?.metaPixelId ?? null;

  const adsetBody: Record<string, string> = {
    name: adsetName,
    campaign_id: campaign.id,
    billing_event: "IMPRESSIONS",
    optimization_goal: OPTIMIZATION_MAP[objective],
    bid_strategy: "LOWEST_COST_WITHOUT_CAP",
    targeting: JSON.stringify(targeting),
    status: "PAUSED",
    start_time: String(startTime)
  };

  if (!isCbo) adsetBody.daily_budget = String(dailyBudgetMinor);

  if (draft.adset.schedule.end) {
    const endTime = parseScheduleTime(draft.adset.schedule.end, 86400 * 7);
    if (endTime > startTime) adsetBody.end_time = String(endTime);
  }

  if (objective === "leads") {
    const promoted: Record<string, string> = { page_id: pageId };
    const formId = draft.ad.leadFormId ?? settings?.metaLeadFormId;
    if (draft.ad.destinationType === "instant_form" && formId) {
      promoted.lead_gen_form_id = formId;
    } else if (formId && draft.adset.conversionLocation !== "website") {
      promoted.lead_gen_form_id = formId;
    }
    adsetBody.promoted_object = JSON.stringify(promoted);
  }

  if (objective === "sales" && pixelId) {
    adsetBody.promoted_object = JSON.stringify({
      pixel_id: pixelId,
      custom_event_type: "PURCHASE"
    });
  }

  const adset = await metaPost<{ id: string }>(`/${actId}/adsets`, token, adsetBody);

  const linkUrl =
    draft.ad.destinationType === "instant_form" && draft.ad.leadFormId
      ? input.linkUrl || "https://www.facebook.com"
      : draft.ad.linkUrl.trim() || input.linkUrl;

  const assetFeedSpec: Record<string, unknown> = {
    images: draft.ad.imageHashes.map((hash) => ({ hash })),
    titles: draft.ad.titles.filter((t) => t.trim()).map((text) => ({ text: text.trim() })),
    bodies: draft.ad.bodies.filter((t) => t.trim()).map((text) => ({ text: text.trim() })),
    link_urls: [{ website_url: linkUrl }],
    call_to_action_types: [objective === "leads" ? "SIGN_UP" : cta]
  };

  const objectStory: Record<string, unknown> = { page_id: pageId };
  if (instagramId) objectStory.instagram_actor_id = instagramId;

  const creative = await metaPost<{ id: string }>(`/${actId}/adcreatives`, token, {
    name: `${campaignName} — Creative`,
    object_story_spec: JSON.stringify(objectStory),
    asset_feed_spec: JSON.stringify(assetFeedSpec)
  });

  const ad = await metaPost<{ id: string }>(`/${actId}/ads`, token, {
    name: adName,
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

export async function createFullMetaCampaign(
  input: CreateFullCampaignInput
): Promise<CreateFullCampaignResult> {
  const objective = normalizeObjective(input.objective);
  const draftLike: CampaignDraftPayload = {
    version: 1,
    clientSlug: "",
    adAccountId: input.adAccountId,
    buyingType: "auction",
    objective,
    visitedNodes: ["campaign", "adset", "ad", "review"],
    campaign: {
      name: input.campaignName,
      budgetLevel: input.budgetLevel ?? "adset",
      dailyBudgetBRL: input.dailyBudgetBRL,
      bidStrategy: "lowest_cost",
      specialAdCategories: input.specialAdCategories ?? [],
      abTestEnabled: false
    },
    adset: {
      name: input.adsetName ?? `${input.campaignName} — Ad Set`,
      conversionLocation: "website_and_form",
      dynamicCreative: true,
      schedule: { start: input.scheduleStart ?? null, end: input.scheduleEnd ?? null },
      targeting: {
        locations: [],
        ageMin: input.targeting?.ageMin ?? 18,
        ageMax: input.targeting?.ageMax ?? 65,
        gender: "all",
        interests: [],
        locales: [],
        customAudienceIds: input.targeting?.customAudienceIds ?? [],
        excludedAudienceIds: input.targeting?.excludedAudienceIds ?? []
      },
      placements: "advantage_plus"
    },
    ad: {
      name: input.adName ?? `${input.campaignName} — Ad`,
      pageId: input.pageId,
      instagramActorId: input.instagramActorId ?? null,
      pixelId: input.pixelId ?? null,
      format: "single_image",
      imageHashes: input.imageHashes,
      titles: input.titles,
      bodies: input.descriptions,
      destinationType: input.destinationType ?? "website",
      linkUrl: input.linkUrl,
      leadFormId: input.leadFormId ?? null,
      urlParams: "",
      tracking: { websiteEvents: false, appEvents: false, offlineEvents: false }
    }
  };

  if (input.targeting) {
    const apiT = input.targeting;
    if (apiT.countries?.length) {
      draftLike.adset.targeting.locations = apiT.countries.map((c) => ({
        value: c,
        label: c,
        meta: { type: "country", countryCode: c }
      }));
    }
    if (apiT.ageMin) draftLike.adset.targeting.ageMin = apiT.ageMin;
    if (apiT.ageMax) draftLike.adset.targeting.ageMax = apiT.ageMax;
    if (apiT.genders?.length === 1) {
      draftLike.adset.targeting.gender = apiT.genders[0] === 1 ? "male" : "female";
    }
    if (apiT.interests?.length) {
      draftLike.adset.targeting.interests = apiT.interests.map((i) => ({
        value: i.id,
        label: i.name ?? i.id
      }));
    }
    if (apiT.locales?.length) {
      draftLike.adset.targeting.locales = apiT.locales.map((l) => ({
        value: String(l),
        label: String(l)
      }));
    }
  }

  return createCampaignFromDraft({
    accessToken: input.accessToken,
    adAccountId: input.adAccountId,
    draft: draftLike,
    pageId: input.pageId,
    linkUrl: input.linkUrl,
    settings: input.settings,
    callToAction: input.callToAction
  });
}
