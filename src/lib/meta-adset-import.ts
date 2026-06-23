import type { AdSetDraftItem, DraftTargeting } from "@/lib/campaign-draft";
import { pickInstagramActorId } from "@/lib/meta-instagram";
import { conversionEventFromPromotedObject } from "@/lib/meta-promoted-object";
import type { MetaAdSetDetail } from "@/lib/meta-graph";

export type ConversionLocation =
  | "website"
  | "instant_form"
  | "website_and_form"
  | "messaging"
  | "calls"
  | "app";

export type MessagingChannel = "whatsapp" | "messenger" | "instagram";

export function mapGeoToDraftLocations(targeting?: Record<string, unknown>): DraftTargeting["locations"] {
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
  const custom = geo.custom_locations as Array<{
    latitude?: number;
    longitude?: number;
    radius?: number;
    distance_unit?: string;
  }> | undefined;
  if (custom?.length) {
    for (const pin of custom) {
      if (pin.latitude == null || pin.longitude == null) continue;
      out.push({
        value: `custom_${pin.latitude}_${pin.longitude}`,
        label: `${pin.latitude.toFixed(4)}, ${pin.longitude.toFixed(4)}`,
        meta: {
          type: "custom_location",
          latitude: pin.latitude,
          longitude: pin.longitude,
          radius: pin.radius ?? 5,
          distanceUnit: pin.distance_unit === "mile" ? "mile" : "kilometer"
        }
      });
    }
  }
  return out;
}

function mapInterestsFromTargeting(targeting?: Record<string, unknown>): DraftTargeting["interests"] {
  const specs = targeting?.flexible_spec as Array<Record<string, unknown>> | undefined;
  if (!specs?.length) return [];
  const out: DraftTargeting["interests"] = [];
  for (const spec of specs) {
    const interests = spec.interests as Array<{ id: string; name?: string }> | undefined;
    for (const i of interests ?? []) {
      if (!out.some((x) => x.value === i.id)) {
        out.push({ value: i.id, label: i.name?.trim() || i.id });
      }
    }
  }
  return out;
}

function mapDetailedGroupsFromTargeting(targeting?: Record<string, unknown>): DraftTargeting["detailedGroups"] {
  const specs = targeting?.flexible_spec as Array<Record<string, unknown>> | undefined;
  if (!specs?.length) return [];
  return specs.map((spec) => {
    const interests = (spec.interests as Array<{ id: string; name?: string }> | undefined) ?? [];
    const behaviors = (spec.behaviors as Array<{ id: string; name?: string }> | undefined) ?? [];
    const lifeEvents = (spec.life_events as Array<{ id: string; name?: string }> | undefined) ?? [];
    const items = [
      ...interests.map((i) => ({
        value: i.id,
        label: i.name?.trim() || i.id,
        meta: { kind: "interest" as const }
      })),
      ...behaviors.map((b) => ({
        value: b.id,
        label: b.name?.trim() || b.id,
        meta: { kind: "behavior" as const }
      })),
      ...lifeEvents.map((e) => ({
        value: e.id,
        label: e.name?.trim() || e.id,
        meta: { kind: "demographic" as const }
      }))
    ];
    return { items };
  });
}

export function mapMetaTargetingToDraft(targeting?: Record<string, unknown>): DraftTargeting {
  const ageMin = Number(targeting?.age_min) || 18;
  const ageMax = Number(targeting?.age_max) || 65;
  const genders = targeting?.genders as number[] | undefined;
  let gender: DraftTargeting["gender"] = "all";
  if (genders?.length === 1) gender = genders[0] === 1 ? "male" : "female";

  const localesRaw = targeting?.locales as number[] | undefined;
  const locales =
    localesRaw?.map((key) => ({
      value: String(key),
      label: String(key)
    })) ?? [];

  const customAudiences = targeting?.custom_audiences as Array<{ id: string }> | undefined;
  const excluded = targeting?.excluded_custom_audiences as Array<{ id: string }> | undefined;

  const detailedGroups = mapDetailedGroupsFromTargeting(targeting);
  const interests =
    detailedGroups.length > 0
      ? detailedGroups.flatMap((g) => g.items.filter((i) => i.meta?.kind === "interest"))
      : mapInterestsFromTargeting(targeting);

  return {
    locations: mapGeoToDraftLocations(targeting),
    ageMin,
    ageMax,
    gender,
    interests,
    locales,
    customAudienceIds: customAudiences?.map((a) => a.id) ?? [],
    excludedAudienceIds: excluded?.map((a) => a.id) ?? [],
    detailedGroups,
    advantageAudience: Boolean(
      (targeting?.targeting_automation as { advantage_audience?: number } | undefined)?.advantage_audience
    )
  };
}

export function inferConversionLocationFromAdset(adset: MetaAdSetDetail): {
  conversionLocation: ConversionLocation;
  messagingChannels: MessagingChannel[];
} {
  const goal = (adset.optimization_goal ?? "").toUpperCase();
  const dest = (adset.destination_type ?? "").toUpperCase();

  if (goal.includes("CONVERSATION") || dest.includes("MESSAGING") || dest.includes("WHATSAPP")) {
    const channels: MessagingChannel[] = [];
    if (dest.includes("WHATSAPP")) channels.push("whatsapp");
    if (dest.includes("MESSENGER")) channels.push("messenger");
    if (dest.includes("INSTAGRAM")) channels.push("instagram");
    if (!channels.length) channels.push("whatsapp", "messenger", "instagram");
    return { conversionLocation: "messaging", messagingChannels: channels };
  }
  if (goal.includes("QUALITY_CALL") || dest.includes("PHONE_CALL")) {
    return { conversionLocation: "calls", messagingChannels: [] };
  }
  if (goal.includes("APP") || dest.includes("APP")) {
    return { conversionLocation: "app", messagingChannels: [] };
  }

  const promoted = adset.promoted_object ?? {};
  if (promoted.lead_gen_form_id) {
    return { conversionLocation: "instant_form", messagingChannels: [] };
  }
  if (promoted.pixel_id) {
    return { conversionLocation: "website", messagingChannels: [] };
  }
  return { conversionLocation: "website_and_form", messagingChannels: [] };
}

export function mapPlacementsFromTargeting(targeting?: Record<string, unknown>): AdSetDraftItem["placements"] {
  const platforms = targeting?.publisher_platforms as string[] | undefined;
  if (!platforms?.length) {
    return { mode: "advantage_plus", platforms: [], positions: [], devices: [] };
  }
  const fb = (targeting?.facebook_positions as string[]) ?? [];
  const ig = (targeting?.instagram_positions as string[]) ?? [];
  const an = (targeting?.audience_network_positions as string[]) ?? [];
  const msg = (targeting?.messenger_positions as string[]) ?? [];
  const positions = [...fb, ...ig, ...an, ...msg];
  const devices = (targeting?.device_platforms as string[]) ?? [];
  return {
    mode: "manual",
    platforms: platforms as AdSetDraftItem["placements"]["platforms"],
    positions: positions as AdSetDraftItem["placements"]["positions"],
    devices: devices as AdSetDraftItem["placements"]["devices"]
  };
}

export function extractInheritedAdsetFromMeta(
  adset: MetaAdSetDetail,
  adsetName: string
): Partial<AdSetDraftItem> {
  const { conversionLocation, messagingChannels } = inferConversionLocationFromAdset(adset);
  const promoted = adset.promoted_object ?? {};
  const pixelId = typeof promoted.pixel_id === "string" ? promoted.pixel_id : null;
  const conversionEvent = conversionEventFromPromotedObject(promoted);
  const dynamicCreative = adset.is_dynamic_creative ?? true;

  return {
    name: adsetName,
    conversionLocation,
    messagingChannels,
    pixelId,
    conversionEvent,
    dynamicCreative,
    schedule: {
      start: adset.start_time ?? null,
      end: adset.end_time ?? null
    },
    targeting: mapMetaTargetingToDraft(adset.targeting),
    placements: mapPlacementsFromTargeting(adset.targeting)
  };
}

export function pickValidatedInstagramId(
  candidates: Array<string | null | undefined>,
  allowedIds: string[]
): string | null {
  return pickInstagramActorId(candidates, allowedIds);
}
