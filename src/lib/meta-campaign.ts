import type { ClientMetaSettings } from "@/db/entities/ClientMetaSettings";
import type { AdDraftItem, AdSetDraftItem, CampaignDraftPayload } from "@/lib/campaign-draft";
import { draftTargetingToApi, resolveAdTargetAdsets } from "@/lib/campaign-draft";
import { defaultPlacements, placementsToMetaTargeting } from "@/lib/campaign-placements";
import { composeAdLinkUrl, defaultUtm, type UtmTokenContext } from "@/lib/campaign-utm";
import { buildMetaAssetFeedSpec } from "@/lib/meta-ad-creative";
import { mapLimit } from "@/lib/concurrency";
import { buildTargetingFromSettings } from "@/lib/client-meta-settings";
import { pickInstagramActorId } from "@/lib/meta-instagram";
import { fetchInstagramAccountsForAdAccount, metaPost } from "@/lib/meta-graph";

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
  flexibleSpecs?: Array<Record<string, Array<{ id: string; name?: string }>>>;
  advantageAudience?: boolean;
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
  onProgress?: (step: PublishProgressStep) => void;
};

export type PublishProgressStep = {
  phase: "campaign" | "adset" | "creative" | "ad";
  current: number;
  total: number;
  label?: string;
};

export type PublishAdResult = { adsetId: string; adId: string; creativeId: string; adName: string };

export type PublishDraftV2Result = {
  campaignId: string;
  adsets: Array<{ draftId: string; adsetId: string; name: string }>;
  ads: PublishAdResult[];
};

export type CreateFullCampaignResult = PublishDraftV2Result & {
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
  if (t.flexibleSpecs?.length) {
    targeting.flexible_spec = t.flexibleSpecs;
  } else if (t.interests?.length) {
    targeting.flexible_spec = [{ interests: t.interests.map((i) => ({ id: i.id, name: i.name })) }];
  }
  if (t.advantageAudience) {
    targeting.targeting_automation = { advantage_audience: 1 };
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

function resolveTargeting(
  adset: AdSetDraftItem,
  settings?: ClientMetaSettings
): Record<string, unknown> {
  const targetingApi = draftTargetingToApi(adset.targeting);
  let base: Record<string, unknown>;
  if (Object.keys(targetingApi).length) {
    base = buildTargetingFromInput(targetingApi);
  } else if (settings) {
    base = buildTargetingFromSettings(settings);
  } else {
    base = { geo_locations: { countries: ["BR"] }, age_min: 18, age_max: 65 };
  }
  const placementFields = placementsToMetaTargeting(adset.placements);
  return { ...base, ...placementFields };
}

function resolveOptimizationGoal(
  objective: CampaignObjectiveKey,
  adset: AdSetDraftItem
): string {
  if (adset.conversionLocation === "messaging") return "CONVERSATIONS";
  if (adset.conversionLocation === "calls") return "QUALITY_CALL";
  if (adset.conversionLocation === "app") return "APP_INSTALLS";
  if (objective === "sales") return "OFFSITE_CONVERSIONS";
  if (adset.conversionLocation === "website" && adset.pixelId) return "OFFSITE_CONVERSIONS";
  return OPTIMIZATION_MAP[objective] ?? "LEAD_GENERATION";
}

function resolveDestinationType(adset: AdSetDraftItem): string | null {
  if (adset.conversionLocation === "messaging") {
    if (adset.messagingChannels.includes("whatsapp")) return "WHATSAPP";
    if (adset.messagingChannels.includes("messenger")) return "MESSENGER";
    if (adset.messagingChannels.includes("instagram")) return "INSTAGRAM_DIRECT";
    return "MESSAGING_APPS";
  }
  if (adset.conversionLocation === "calls") return "PHONE_CALL";
  if (adset.conversionLocation === "instant_form") return "ON_AD";
  if (adset.conversionLocation === "website") return "WEBSITE";
  return null;
}

function buildPromotedObject(
  objective: CampaignObjectiveKey,
  ad: AdDraftItem,
  adset: AdSetDraftItem,
  pageId: string,
  settings?: ClientMetaSettings
): Record<string, string> | null {
  const promoted: Record<string, string> = { page_id: pageId };

  if (adset.conversionLocation === "messaging") {
    return promoted;
  }
  if (adset.conversionLocation === "calls") {
    return promoted;
  }

  if (objective === "leads" || adset.conversionLocation === "instant_form") {
    const formId = ad.leadFormId ?? settings?.metaLeadFormId;
    if (ad.destinationType === "instant_form" && formId) {
      promoted.lead_gen_form_id = formId;
    } else if (formId && adset.conversionLocation !== "website") {
      promoted.lead_gen_form_id = formId;
    }
    const pixelId = adset.pixelId ?? ad.pixelId ?? settings?.metaPixelId ?? null;
    if (pixelId && adset.conversionLocation !== "instant_form") {
      promoted.pixel_id = pixelId;
      promoted.custom_event_type = adset.conversionEvent || "LEAD";
    }
    return promoted;
  }

  const pixelId = adset.pixelId ?? ad.pixelId ?? settings?.metaPixelId ?? null;
  if ((objective === "sales" || adset.conversionLocation === "website") && pixelId) {
    promoted.pixel_id = pixelId;
    promoted.custom_event_type = adset.conversionEvent || "PURCHASE";
    return promoted;
  }
  return Object.keys(promoted).length > 1 ? promoted : null;
}

function buildPageWelcomeMessage(ad: AdDraftItem) {
  const tpl = ad.messageTemplate;
  const greeting = tpl?.greeting?.trim() || ad.whatsappWelcomeMessage?.trim();
  if (!greeting) return null;
  const payload: Record<string, unknown> = {
    type: "PAGE_WELCOME_MESSAGE",
    message: { text: greeting }
  };
  const icebreakers = tpl?.icebreakers?.filter((x) => x.trim()) ?? [];
  if (icebreakers.length) {
    payload.ice_breakers = icebreakers.map((text) => ({ title: text.slice(0, 80), response: text }));
  }
  return payload;
}

async function createAdForAdset(args: {
  token: string;
  actId: string;
  campaignName: string;
  adsetId: string;
  adset: AdSetDraftItem;
  ad: AdDraftItem;
  adName: string;
  objective: CampaignObjectiveKey;
  pageId: string;
  linkUrl: string;
  cta: string;
  settings?: ClientMetaSettings;
  allowedInstagramActorIds?: string[];
}): Promise<{ adId: string; creativeId: string }> {
  const { ad, objective, pageId, linkUrl, cta, settings, token, actId, campaignName, adsetId, adName, allowedInstagramActorIds = [] } =
    args;

  const baseLink =
    ad.destinationType === "instant_form" && ad.leadFormId
      ? linkUrl || "https://www.facebook.com"
      : ad.linkUrl.trim() || linkUrl;
  const utmCtx: UtmTokenContext = {
    campaignName,
    adsetName: args.adset.name,
    adName
  };
  const resolvedLink = composeAdLinkUrl(baseLink, ad.utm, ad.urlParams, utmCtx);

  const resolvedCta =
    ad.callToAction.trim() ||
    (ad.destinationType === "whatsapp"
      ? "WHATSAPP_MESSAGE"
      : objective === "leads" && ad.destinationType === "instant_form"
        ? "SIGN_UP"
        : cta);

  const assetFeedSpec = buildMetaAssetFeedSpec({
    ad,
    resolvedLink,
    resolvedCta
  });

  const instagramId = pickInstagramActorId(
    [ad.instagramActorId, settings?.instagramActorId],
    allowedInstagramActorIds
  );
  const objectStory: Record<string, unknown> = { page_id: pageId };
  if (instagramId) objectStory.instagram_actor_id = instagramId;
  const welcome = buildPageWelcomeMessage(ad);
  if (welcome) objectStory.page_welcome_message = welcome;

  const creative = await metaPost<{ id: string }>(`/${actId}/adcreatives`, token, {
    name: `${campaignName} — ${adName} Creative`,
    object_story_spec: JSON.stringify(objectStory),
    asset_feed_spec: JSON.stringify(assetFeedSpec)
  });

  const metaAd = await metaPost<{ id: string }>(`/${actId}/ads`, token, {
    name: adName,
    adset_id: adsetId,
    creative: JSON.stringify({ creative_id: creative.id }),
    status: "PAUSED"
  });

  return { adId: metaAd.id, creativeId: creative.id };
}

export async function publishAdToAdset(
  input: {
    accessToken: string;
    adAccountId: string;
    adsetId: string;
    ad: AdDraftItem;
    adset: AdSetDraftItem;
    objective: CampaignObjectiveKey;
    pageId: string;
    linkUrl: string;
    settings?: ClientMetaSettings;
    callToAction?: string;
    campaignName?: string;
  }
): Promise<{ adId: string; creativeId: string }> {
  const actId = normalizeAdAccountId(input.adAccountId);
  const cta = input.callToAction ?? input.settings?.defaultCta ?? "LEARN_MORE";
  const campaignName = input.campaignName ?? "Campanha";
  const adName = input.ad.name.trim() || `${campaignName} — Ad`;

  const igAccounts = await fetchInstagramAccountsForAdAccount(input.accessToken, input.adAccountId);
  const allowedInstagramActorIds = igAccounts.map((a) => a.id);

  return createAdForAdset({
    token: input.accessToken,
    actId,
    campaignName,
    adsetId: input.adsetId,
    adset: input.adset,
    ad: input.ad,
    adName,
    objective: input.objective,
    pageId: input.pageId,
    linkUrl: input.linkUrl,
    cta,
    settings: input.settings,
    allowedInstagramActorIds
  });
}

export async function publishAdsetToCampaign(input: {
  accessToken: string;
  adAccountId: string;
  metaCampaignId: string;
  adset: AdSetDraftItem;
  ad: AdDraftItem;
  objective: CampaignObjectiveKey;
  campaign: CampaignDraftPayload["campaign"];
  pageId: string;
  linkUrl: string;
  settings?: ClientMetaSettings;
  callToAction?: string;
  campaignName?: string;
  isCampaignBudget?: boolean;
}): Promise<{ adsetId: string; adId: string; creativeId: string }> {
  const actId = normalizeAdAccountId(input.adAccountId);
  const token = input.accessToken;
  const objective = input.objective;
  const dailyBudgetMinor = Math.max(100, Math.round(input.campaign.dailyBudgetBRL * 100));
  const settings = input.settings;
  const cta = input.callToAction ?? settings?.defaultCta ?? "LEARN_MORE";
  const campaignName = input.campaignName ?? input.campaign.name ?? "Campanha";
  const isCbo = input.isCampaignBudget ?? input.campaign.budgetLevel === "campaign";

  const adsetName = input.adset.name.trim() || `${campaignName} — Ad Set`;
  const startTime = parseScheduleTime(input.adset.schedule.start, 3600);
  const targeting = resolveTargeting(input.adset, settings);

  const adsetBody: Record<string, string> = {
    name: adsetName,
    campaign_id: input.metaCampaignId,
    billing_event: "IMPRESSIONS",
    optimization_goal: resolveOptimizationGoal(objective, input.adset),
    bid_strategy: "LOWEST_COST_WITHOUT_CAP",
    targeting: JSON.stringify(targeting),
    status: "PAUSED",
    start_time: String(startTime)
  };

  const destinationType = resolveDestinationType(input.adset);
  if (destinationType) adsetBody.destination_type = destinationType;
  if (!isCbo) adsetBody.daily_budget = String(dailyBudgetMinor);

  if (input.adset.schedule.end) {
    const endTime = parseScheduleTime(input.adset.schedule.end, 86400 * 7);
    if (endTime > startTime) adsetBody.end_time = String(endTime);
  }

  const promoted = buildPromotedObject(objective, input.ad, input.adset, input.pageId, settings);
  if (promoted) adsetBody.promoted_object = JSON.stringify(promoted);

  const metaAdset = await metaPost<{ id: string }>(`/${actId}/adsets`, token, adsetBody);

  const igAccounts = await fetchInstagramAccountsForAdAccount(token, input.adAccountId);
  const allowedInstagramActorIds = igAccounts.map((a) => a.id);
  const adName = input.ad.name.trim() || `${campaignName} — ${adsetName} — Ad`;

  const { adId, creativeId } = await createAdForAdset({
    token,
    actId,
    campaignName,
    adsetId: metaAdset.id,
    adset: input.adset,
    ad: input.ad,
    adName,
    objective,
    pageId: input.pageId,
    linkUrl: input.linkUrl,
    cta,
    settings,
    allowedInstagramActorIds
  });

  return { adsetId: metaAdset.id, adId, creativeId };
}

export async function publishDraftV2(input: CreateCampaignFromDraftInput): Promise<PublishDraftV2Result> {
  const { draft } = input;
  const actId = normalizeAdAccountId(input.adAccountId);
  const token = input.accessToken;
  const objective = draft.objective;
  const dailyBudgetMinor = Math.max(100, Math.round(draft.campaign.dailyBudgetBRL * 100));
  const settings = input.settings;
  const cta = input.callToAction ?? settings?.defaultCta ?? "LEARN_MORE";
  const prefix = settings?.campaignNamePrefix?.trim();
  const campaignName = prefix ? `${prefix} ${draft.campaign.name}` : draft.campaign.name;

  const specialCategories =
    draft.campaign.specialAdCategories.length > 0
      ? JSON.stringify(draft.campaign.specialAdCategories)
      : settings?.specialAdCategories?.length
        ? JSON.stringify(settings.specialAdCategories)
        : "[]";

  const isCbo = draft.campaign.budgetLevel === "campaign";
  const buyingType = draft.buyingType === "reservation" ? "RESERVED" : "AUCTION";

  const campaignBody: Record<string, string> = {
    name: campaignName,
    objective: OBJECTIVE_MAP[objective],
    status: "PAUSED",
    special_ad_categories: specialCategories,
    // CBO (campaign daily_budget) is incompatible with ad set budget sharing (Meta 4834002).
    // For ABO, Meta v24+ requires this field when budgets live on ad sets.
    is_adset_budget_sharing_enabled: "false",
    buying_type: buyingType
  };
  if (isCbo) campaignBody.daily_budget = String(dailyBudgetMinor);

  input.onProgress?.({ phase: "campaign", current: 0, total: 1, label: campaignName });
  const campaign = await metaPost<{ id: string }>(`/${actId}/campaigns`, token, campaignBody);
  input.onProgress?.({ phase: "campaign", current: 1, total: 1 });

  const igAccounts = await fetchInstagramAccountsForAdAccount(token, input.adAccountId);
  const allowedInstagramActorIds = igAccounts.map((a) => a.id);

  const adsetResults: PublishDraftV2Result["adsets"] = [];
  const adsetIdMap = new Map<string, string>();
  const totalAdsets = draft.adsets.length;

  await mapLimit(draft.adsets, 2, async (adset, idx) => {
    const adsetName = adset.name.trim() || `${campaignName} — Ad Set ${idx + 1}`;
    const startTime = parseScheduleTime(adset.schedule.start, 3600);
    const targeting = resolveTargeting(adset, settings);
    const primaryAd = draft.ads[0]!;
    const pageId = primaryAd.pageId || input.pageId;

    const adsetBody: Record<string, string> = {
      name: adsetName,
      campaign_id: campaign.id,
      billing_event: "IMPRESSIONS",
      optimization_goal: resolveOptimizationGoal(objective, adset),
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      targeting: JSON.stringify(targeting),
      status: "PAUSED",
      start_time: String(startTime)
    };

    const destinationType = resolveDestinationType(adset);
    if (destinationType) adsetBody.destination_type = destinationType;

    if (!isCbo) adsetBody.daily_budget = String(dailyBudgetMinor);

    if (adset.schedule.end) {
      const endTime = parseScheduleTime(adset.schedule.end, 86400 * 7);
      if (endTime > startTime) adsetBody.end_time = String(endTime);
    }

    const promoted = buildPromotedObject(objective, primaryAd, adset, pageId, settings);
    if (promoted) adsetBody.promoted_object = JSON.stringify(promoted);

    input.onProgress?.({
      phase: "adset",
      current: idx,
      total: totalAdsets,
      label: adsetName
    });

    const metaAdset = await metaPost<{ id: string }>(`/${actId}/adsets`, token, adsetBody);
    adsetIdMap.set(adset.id, metaAdset.id);
    adsetResults.push({ draftId: adset.id, adsetId: metaAdset.id, name: adsetName });
  });

  const publishPairs: Array<{ ad: AdDraftItem; adset: AdSetDraftItem; metaAdsetId: string }> = [];
  for (const ad of draft.ads) {
    for (const adset of resolveAdTargetAdsets(draft, ad)) {
      const metaAdsetId = adsetIdMap.get(adset.id);
      if (metaAdsetId) publishPairs.push({ ad, adset, metaAdsetId });
    }
  }

  const adResults: PublishAdResult[] = [];
  const totalAds = publishPairs.length;

  await mapLimit(publishPairs, 2, async (pair, idx) => {
    const pageId = pair.ad.pageId || input.pageId;
    const adName =
      pair.ad.name.trim() ||
      `${campaignName} — ${pair.adset.name || "Ad"} — ${idx + 1}`;

    input.onProgress?.({
      phase: "creative",
      current: idx,
      total: totalAds,
      label: adName
    });

    const { adId, creativeId } = await createAdForAdset({
      token,
      actId,
      campaignName,
      adsetId: pair.metaAdsetId,
      adset: pair.adset,
      ad: pair.ad,
      adName,
      objective,
      pageId,
      linkUrl: input.linkUrl,
      cta,
      settings,
      allowedInstagramActorIds
    });

    adResults.push({
      adsetId: pair.metaAdsetId,
      adId,
      creativeId,
      adName
    });

    input.onProgress?.({ phase: "ad", current: idx + 1, total: totalAds, label: adName });
  });

  return {
    campaignId: campaign.id,
    adsets: adsetResults,
    ads: adResults
  };
}

export async function createCampaignFromDraft(
  input: CreateCampaignFromDraftInput
): Promise<CreateFullCampaignResult> {
  const result = await publishDraftV2(input);
  const firstAdset = result.adsets[0];
  const firstAd = result.ads[0];
  return {
    ...result,
    adsetId: firstAdset?.adsetId ?? "",
    creativeId: firstAd?.creativeId ?? "",
    adId: firstAd?.adId ?? ""
  };
}

export async function createFullMetaCampaign(
  input: CreateFullCampaignInput
): Promise<CreateFullCampaignResult> {
  const objective = normalizeObjective(input.objective);
  const adsetId = `legacy_adset_${Date.now()}`;
  const adId = `legacy_ad_${Date.now()}`;
  const draftLike: CampaignDraftPayload = {
    version: 2,
    clientSlug: "",
    adAccountId: input.adAccountId,
    buyingType: "auction",
    objective,
    copyFromCampaignEnabled: false,
    copyFromCampaignId: null,
    visitedNodes: ["campaign", "adset", "ad", "review"],
    activeAdsetId: adsetId,
    activeAdId: adId,
    adAssignment: "all_adsets",
    selectedAdsetIdForAds: null,
    campaign: {
      name: input.campaignName,
      budgetLevel: input.budgetLevel ?? "adset",
      dailyBudgetBRL: input.dailyBudgetBRL,
      bidStrategy: "lowest_cost",
      specialAdCategories: input.specialAdCategories ?? [],
      abTestEnabled: false
    },
    adsetBatch: {
      enabled: false,
      extraCount: 0,
      variationAxes: [],
      locationVariants: [],
      ageRanges: [],
      audienceVariants: [],
      interestVariants: [],
      genderVariants: []
    },
    adsets: [
      {
        id: adsetId,
        name: input.adsetName ?? `${input.campaignName} — Ad Set`,
        conversionLocation: "website_and_form",
        messagingChannels: [],
        pixelId: null,
        conversionEvent: "LEAD",
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
          excludedAudienceIds: input.targeting?.excludedAudienceIds ?? [],
          detailedGroups: [],
          advantageAudience: false
        },
        placements: defaultPlacements()
      }
    ],
    ads: [
      {
        id: adId,
        name: input.adName ?? `${input.campaignName} — Ad`,
        pageId: input.pageId,
        instagramActorId: input.instagramActorId ?? null,
        pixelId: input.pixelId ?? null,
        format: "single_image",
        imageHashes: input.imageHashes,
        videoIds: [],
        titles: input.titles,
        bodies: input.descriptions,
        destinationType: input.destinationType ?? "website",
        linkUrl: input.linkUrl,
        leadFormId: input.leadFormId ?? null,
        urlParams: "",
        callToAction: input.callToAction ?? "",
        whatsappWelcomeMessage: null,
        messageTemplate: null,
        utm: defaultUtm(),
        targetAdsetIds: ["__all__"],
        tracking: { websiteEvents: false, appEvents: false, offlineEvents: false }
      }
    ]
  };

  if (input.targeting) {
    const apiT = input.targeting;
    const adset = draftLike.adsets[0]!;
    if (apiT.countries?.length) {
      adset.targeting.locations = apiT.countries.map((c) => ({
        value: c,
        label: c,
        meta: { type: "country", countryCode: c }
      }));
    }
    if (apiT.cities?.length) {
      adset.targeting.locations = apiT.cities.map((c) => ({
        value: c.key,
        label: c.key,
        meta: { type: "city", radius: c.radius, distanceUnit: c.distanceUnit }
      }));
    }
    if (apiT.ageMin) adset.targeting.ageMin = apiT.ageMin;
    if (apiT.ageMax) adset.targeting.ageMax = apiT.ageMax;
    if (apiT.genders?.length === 1) {
      adset.targeting.gender = apiT.genders[0] === 1 ? "male" : "female";
    }
    if (apiT.interests?.length) {
      adset.targeting.interests = apiT.interests.map((i) => ({
        value: i.id,
        label: i.name ?? i.id
      }));
    }
    if (apiT.locales?.length) {
      adset.targeting.locales = apiT.locales.map((l) => ({
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
