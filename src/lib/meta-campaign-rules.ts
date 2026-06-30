import type { CampaignObjectiveKey, ConversionLocation } from "@/lib/campaign-draft";

/**
 * Single source of truth for Meta ad-set compatibility.
 *
 * Both the API mapping (`meta-campaign.ts`) and the pre-publish validation
 * (`campaign-draft.ts`) derive from the functions here, so they can never
 * disagree — the root cause of "the score said OK but Meta rejected the
 * campaign" bugs. Given an (objective, conversionLocation, hasPixel) triple
 * this returns Meta fields that are guaranteed mutually compatible.
 */

/** Default optimization goal per objective when no conversion location forces another. */
const OPTIMIZATION_BY_OBJECTIVE: Record<CampaignObjectiveKey, string> = {
  awareness: "REACH",
  traffic: "LINK_CLICKS",
  engagement: "POST_ENGAGEMENT",
  leads: "LEAD_GENERATION",
  sales: "OFFSITE_CONVERSIONS",
  app: "APP_INSTALLS"
};

/** What the ad set's `promoted_object` must carry to satisfy the chosen goal. */
export type ConversionSourceKind = "pixel" | "lead_form" | "app" | "messaging" | "calls" | "none";

export type AdsetMetaConfig = {
  optimizationGoal: string;
  /** WEBSITE / ON_AD / PHONE_CALL / null. Messaging destination is resolved by channel elsewhere. */
  destinationType: string | null;
  source: ConversionSourceKind;
};

export function isWebsiteLocation(loc: ConversionLocation): boolean {
  return loc === "website" || loc === "website_and_form";
}

export function deriveAdsetMetaConfig(
  objective: CampaignObjectiveKey,
  conversionLocation: ConversionLocation,
  hasPixel: boolean
): AdsetMetaConfig {
  // Location-driven goals override the objective default.
  if (conversionLocation === "messaging") {
    return { optimizationGoal: "CONVERSATIONS", destinationType: null, source: "messaging" };
  }
  if (conversionLocation === "calls") {
    return { optimizationGoal: "QUALITY_CALL", destinationType: "PHONE_CALL", source: "calls" };
  }
  if (conversionLocation === "app") {
    return { optimizationGoal: "APP_INSTALLS", destinationType: null, source: "app" };
  }
  if (conversionLocation === "instant_form") {
    return { optimizationGoal: "LEAD_GENERATION", destinationType: "ON_AD", source: "lead_form" };
  }

  // Engagement/awareness never carry a conversion source (Meta rejects a
  // conversion goal/promoted object for these objectives).
  if (objective === "engagement") {
    // POST_ENGAGEMENT needs an on-post destination. Without it Meta falls back to
    // a website destination and demands a URL even for a plain post with no link.
    return { optimizationGoal: "POST_ENGAGEMENT", destinationType: "ON_POST", source: "none" };
  }
  if (objective === "awareness") {
    return { optimizationGoal: OPTIMIZATION_BY_OBJECTIVE.awareness, destinationType: null, source: "none" };
  }

  // Website / website_and_form locations.
  if (isWebsiteLocation(conversionLocation)) {
    if (objective === "sales") {
      return { optimizationGoal: "OFFSITE_CONVERSIONS", destinationType: "WEBSITE", source: "pixel" };
    }
    if (objective === "leads") {
      // Pixel-based website conversions when a pixel exists, otherwise a lead form.
      return hasPixel
        ? { optimizationGoal: "OFFSITE_CONVERSIONS", destinationType: "WEBSITE", source: "pixel" }
        : { optimizationGoal: "LEAD_GENERATION", destinationType: "WEBSITE", source: "lead_form" };
    }
    if (objective === "traffic") {
      // A pixel turns traffic into website conversions; otherwise plain link clicks.
      return hasPixel
        ? { optimizationGoal: "OFFSITE_CONVERSIONS", destinationType: "WEBSITE", source: "pixel" }
        : { optimizationGoal: "LINK_CLICKS", destinationType: "WEBSITE", source: "none" };
    }
  }

  return {
    optimizationGoal: OPTIMIZATION_BY_OBJECTIVE[objective] ?? "LINK_CLICKS",
    destinationType: isWebsiteLocation(conversionLocation) ? "WEBSITE" : null,
    source: "none"
  };
}

/**
 * Whether the ad set MUST have a pixel before publish. True only when the
 * objective/location has no non-pixel alternative (sales on a website; leads to
 * a website). Mirrors `deriveAdsetMetaConfig` so validation and mapping agree.
 */
/**
 * Conversion locations Meta allows for each objective. Conservative: only the
 * clearly-invalid options are removed (lead forms are leads-only; the app
 * location is app-only) — everything else stays permissive so no valid setup is
 * blocked. The objective's default location (see `defaultConversionLocationForObjective`)
 * is always included so the UI can fall back to it.
 */
export function conversionLocationsForObjective(
  objective: CampaignObjectiveKey
): ConversionLocation[] {
  switch (objective) {
    case "app":
      return ["app"];
    case "leads":
      return ["website_and_form", "website", "instant_form", "messaging", "calls"];
    case "sales":
    case "traffic":
      return ["website", "messaging", "calls", "app"];
    case "engagement":
    case "awareness":
    default:
      return ["website", "messaging", "calls"];
  }
}

/**
 * Whether an objective allows an off-site WEBSITE destination on the ad creative.
 * OUTCOME_ENGAGEMENT does NOT include WEBSITE in its valid destination_type set,
 * so an asset_feed_spec carrying a website link + CTA makes the creative
 * incompatible ("(#100) The ad's creative is incompatible with the objective").
 * Source: developers.facebook.com/docs/marketing-api/adset/destination_type/
 */
export function objectiveAllowsWebsiteDestination(objective: CampaignObjectiveKey): boolean {
  return objective !== "engagement";
}

/**
 * Whether the pixel + conversion-event fields are relevant at all for this
 * objective/location (i.e. the ad set optimizes for a website conversion).
 * Engagement/awareness/messaging/calls never use a pixel, so the UI hides those
 * fields — no point loading pixels or asking for a conversion event there.
 */
export function adsetUsesPixel(
  objective: CampaignObjectiveKey,
  conversionLocation: ConversionLocation
): boolean {
  return deriveAdsetMetaConfig(objective, conversionLocation, true).source === "pixel";
}

export function adsetRequiresPixel(
  objective: CampaignObjectiveKey,
  conversionLocation: ConversionLocation
): boolean {
  if (
    conversionLocation === "app" ||
    conversionLocation === "messaging" ||
    conversionLocation === "calls" ||
    conversionLocation === "instant_form"
  ) {
    return false;
  }
  if (objective === "sales") return true;
  if (objective === "leads") return isWebsiteLocation(conversionLocation);
  return false;
}
