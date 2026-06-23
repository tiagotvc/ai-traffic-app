import "server-only";

import type { CampaignDraftPayload } from "@/lib/campaign-draft";
import { defaultCampaignDraft } from "@/lib/campaign-draft";
import { extractCreativeRouting } from "@/lib/campaign-ad-import";
import { defaultUtm } from "@/lib/campaign-utm";
import {
  extractInheritedAdsetFromMeta,
  mapMetaTargetingToDraft,
  mapPlacementsFromTargeting
} from "@/lib/meta-adset-import";
import {
  fetchAdSetDetail,
  fetchAdSetsForCampaign,
  fetchAdWithCreative,
  fetchAdsForAdSet,
  fetchCampaign
} from "@/lib/meta-graph";

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

export async function buildDraftPatchFromMetaCampaign(
  accessToken: string,
  metaCampaignId: string,
  locale = "pt-BR"
): Promise<Partial<CampaignDraftPayload> | null> {
  const campaign = await fetchCampaign(accessToken, metaCampaignId);
  const adsets = await fetchAdSetsForCampaign(accessToken, metaCampaignId);
  const selectedAdset = adsets[0];
  if (!selectedAdset) return null;

  const adsetDetail = await fetchAdSetDetail(accessToken, selectedAdset.id);
  const ads = await fetchAdsForAdSet(accessToken, selectedAdset.id);
  const firstAd = ads[0];
  let creativeData: Awaited<ReturnType<typeof fetchAdWithCreative>> | null = null;
  if (firstAd?.id) {
    try {
      creativeData = await fetchAdWithCreative(accessToken, firstAd.id);
    } catch {
      /* optional */
    }
  }

  const targeting = adsetDetail.targeting;
  const feed = creativeData?.creative?.asset_feed_spec as
    | {
        images?: Array<{ hash?: string }>;
        videos?: Array<{ video_id?: string }>;
        titles?: Array<{ text?: string }>;
        bodies?: Array<{ text?: string }>;
      }
    | undefined;
  const imageHashes = feed?.images?.map((i) => i.hash).filter(Boolean) as string[] | undefined;
  const videoIds = feed?.videos?.map((v) => v.video_id).filter(Boolean) as string[] | undefined;
  const titles =
    feed?.titles?.map((t) => t.text).filter(Boolean) ??
    (creativeData?.creative?.title ? [creativeData.creative.title] : []);
  const bodies =
    feed?.bodies?.map((b) => b.text).filter(Boolean) ??
    (creativeData?.creative?.body ? [creativeData.creative.body] : []);
  const storyVideo = (
    creativeData?.creative?.object_story_spec as { video_data?: { video_id?: string } } | undefined
  )?.video_data?.video_id;
  const allVideoIds = [...(videoIds ?? [])];
  if (storyVideo && !allVideoIds.includes(storyVideo)) allVideoIds.push(storyVideo);
  const format = allVideoIds.length ? ("video" as const) : ("single_image" as const);
  const routing = extractCreativeRouting(creativeData?.creative ?? null);
  const story = creativeData?.creative?.object_story_spec as
    | { page_id?: string; instagram_actor_id?: string }
    | undefined;
  const pageId = routing.pageId || story?.page_id || "";

  const objective =
    OBJECTIVE_REVERSE[campaign.objective ?? ""] ?? defaultCampaignDraft(locale).objective;
  const dailyBudgetBRL = campaign.daily_budget
    ? Number(campaign.daily_budget) / 100
    : selectedAdset.daily_budget
      ? Number(selectedAdset.daily_budget) / 100
      : 150;

  const inheritedFromAdset = extractInheritedAdsetFromMeta(
    adsetDetail,
    selectedAdset.name ?? "Conjunto importado"
  );

  return {
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
        ...inheritedFromAdset,
        name: selectedAdset.name ?? "Conjunto importado",
        dynamicCreative: true,
        schedule: { start: null, end: null },
        targeting: mapMetaTargetingToDraft(targeting),
        placements: mapPlacementsFromTargeting(targeting)
      } as CampaignDraftPayload["adsets"][number]
    ],
    ads: [
      {
        id: `imported_ad_${Date.now()}`,
        name: firstAd?.name ?? "Anúncio importado",
        pageId,
        instagramActorId: story?.instagram_actor_id ?? null,
        pixelId: null,
        format,
        imageHashes: format === "video" ? [] : (imageHashes ?? []),
        videoIds: format === "video" ? allVideoIds : [],
        titles: titles as string[],
        bodies: bodies as string[],
        destinationType: routing.destinationType,
        linkUrl: routing.linkUrl,
        leadFormId: routing.leadFormId,
        urlParams: routing.urlParams,
        callToAction: routing.callToAction,
        whatsappWelcomeMessage: routing.whatsappWelcomeMessage,
        messageTemplate: routing.messageTemplate,
        utm: defaultUtm(),
        metaCreativeId: creativeData?.creative?.id ?? null,
        sourceMetaAdId: firstAd?.id ?? null,
        reuseMetaCreative: Boolean(creativeData?.creative?.id),
        targetAdsetIds: ["__all__"],
        tracking: { websiteEvents: false, appEvents: false, offlineEvents: false }
      }
    ],
    copyFromCampaignId: metaCampaignId
  };
}
