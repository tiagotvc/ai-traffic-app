/**
 * Single source of truth for Google Ads campaign compatibility.
 *
 * The Google Ads counterpart to `meta-campaign-rules.ts`: given an (objective,
 * channelType) pair it returns campaign fields that are guaranteed mutually
 * compatible, so the future API mapping (`google-ads-campaign.ts`) and the
 * pre-publish validation can never disagree.
 *
 * Key Google concept (the analogue of Meta's "pixel required"): conversion-based
 * bidding (Maximize conversions / conversion value) requires a **conversion
 * action** to be configured on the account before publish, otherwise the API
 * rejects the campaign.
 *
 * Enum strings match Google Ads API v24:
 * - advertisingChannelType → Campaign.advertising_channel_type
 * - biddingStrategy → the bidding oneof set on Campaign (see BIDDING_STRATEGY_API_FIELD)
 * App campaigns (advertising_channel_type MULTI_CHANNEL) are intentionally out of
 * scope for v1 — they need a different asset/sub-type model and are added later.
 */

export const GOOGLE_ADS_OBJECTIVES = ["sales", "leads", "traffic", "awareness"] as const;
export type GoogleAdsObjectiveKey = (typeof GOOGLE_ADS_OBJECTIVES)[number];

export type GoogleAdsChannelType = "SEARCH" | "DISPLAY" | "PERFORMANCE_MAX" | "VIDEO" | "DEMAND_GEN";

export type GoogleAdsBiddingStrategy =
  | "MAXIMIZE_CONVERSION_VALUE"
  | "MAXIMIZE_CONVERSIONS"
  | "MAXIMIZE_CLICKS"
  | "TARGET_IMPRESSION_SHARE"
  | "TARGET_CPM";

/**
 * REST API (v18) camelCase field name of the bidding oneof to set on the Campaign.
 * "Maximize clicks" has no dedicated strategy — it is `targetSpend` with no target.
 */
export const BIDDING_STRATEGY_API_FIELD: Record<GoogleAdsBiddingStrategy, string> = {
  MAXIMIZE_CONVERSION_VALUE: "maximizeConversionValue",
  MAXIMIZE_CONVERSIONS: "maximizeConversions",
  MAXIMIZE_CLICKS: "targetSpend",
  TARGET_IMPRESSION_SHARE: "targetImpressionShare",
  TARGET_CPM: "targetCpm"
};

export type GoogleAdsCampaignConfig = {
  advertisingChannelType: GoogleAdsChannelType;
  biddingStrategy: GoogleAdsBiddingStrategy;
  /** Conversion-based bidding needs a conversion action configured before publish. */
  requiresConversionTracking: boolean;
};

/** Bidding strategies that optimize toward conversions (require conversion tracking). */
const CONVERSION_BIDDING = new Set<GoogleAdsBiddingStrategy>([
  "MAXIMIZE_CONVERSIONS",
  "MAXIMIZE_CONVERSION_VALUE"
]);

export function biddingRequiresConversionTracking(bidding: GoogleAdsBiddingStrategy): boolean {
  return CONVERSION_BIDDING.has(bidding);
}

/**
 * Channel types offered for each objective. The default (see
 * `defaultChannelForObjective`) is always first and is NEVER Performance Max —
 * Pmax is always an explicit opt-in (many advertisers prefer traditional
 * campaigns for the control/transparency Pmax hides). Conservative: only
 * clearly-mismatched channels are omitted.
 */
const CHANNELS_BY_OBJECTIVE: Record<GoogleAdsObjectiveKey, GoogleAdsChannelType[]> = {
  sales: ["SEARCH", "PERFORMANCE_MAX", "DISPLAY"],
  leads: ["SEARCH", "PERFORMANCE_MAX", "DISPLAY", "DEMAND_GEN"],
  traffic: ["SEARCH", "DISPLAY", "DEMAND_GEN"],
  awareness: ["DISPLAY", "VIDEO", "DEMAND_GEN"]
};

export function channelsForObjective(objective: GoogleAdsObjectiveKey): GoogleAdsChannelType[] {
  return CHANNELS_BY_OBJECTIVE[objective];
}

export function defaultChannelForObjective(objective: GoogleAdsObjectiveKey): GoogleAdsChannelType {
  return CHANNELS_BY_OBJECTIVE[objective][0];
}

export function isChannelAllowedForObjective(
  objective: GoogleAdsObjectiveKey,
  channelType: GoogleAdsChannelType
): boolean {
  return CHANNELS_BY_OBJECTIVE[objective].includes(channelType);
}

/**
 * Whether Performance Max is available for this objective (the UI toggle). Only
 * conversion objectives (sales/leads) offer it — Pmax always optimizes for
 * conversions, so it can't serve traffic or awareness goals.
 */
export function objectiveSupportsPerformanceMax(objective: GoogleAdsObjectiveKey): boolean {
  return CHANNELS_BY_OBJECTIVE[objective].includes("PERFORMANCE_MAX");
}

/**
 * Campaign config for an (objective, channel) pair. Channel defaults to the
 * objective's recommended channel. Mirrors `deriveAdsetMetaConfig`: channel-driven
 * rules override objective defaults (Performance Max is conversion-only).
 */
export function deriveGoogleAdsCampaignConfig(
  objective: GoogleAdsObjectiveKey,
  channelType: GoogleAdsChannelType = defaultChannelForObjective(objective)
): GoogleAdsCampaignConfig {
  // Performance Max only supports conversion-based bidding: value for sales,
  // conversions otherwise. Overrides the per-objective default below.
  if (channelType === "PERFORMANCE_MAX") {
    const biddingStrategy: GoogleAdsBiddingStrategy =
      objective === "sales" ? "MAXIMIZE_CONVERSION_VALUE" : "MAXIMIZE_CONVERSIONS";
    return { advertisingChannelType: channelType, biddingStrategy, requiresConversionTracking: true };
  }

  let biddingStrategy: GoogleAdsBiddingStrategy;
  switch (objective) {
    case "sales":
      biddingStrategy = "MAXIMIZE_CONVERSION_VALUE";
      break;
    case "leads":
      biddingStrategy = "MAXIMIZE_CONVERSIONS";
      break;
    case "traffic":
      biddingStrategy = "MAXIMIZE_CLICKS";
      break;
    case "awareness":
      // Reach: impression share on Search, viewable CPM on Display/Video/Demand Gen.
      biddingStrategy = channelType === "SEARCH" ? "TARGET_IMPRESSION_SHARE" : "TARGET_CPM";
      break;
  }

  return {
    advertisingChannelType: channelType,
    biddingStrategy,
    requiresConversionTracking: biddingRequiresConversionTracking(biddingStrategy)
  };
}

/**
 * Whether the campaign MUST have a conversion action configured before publish.
 * True exactly when the derived bidding strategy optimizes for conversions.
 * Mirrors `adsetRequiresPixel` so validation and mapping agree.
 */
export function campaignRequiresConversionTracking(
  objective: GoogleAdsObjectiveKey,
  channelType?: GoogleAdsChannelType
): boolean {
  return deriveGoogleAdsCampaignConfig(objective, channelType).requiresConversionTracking;
}
