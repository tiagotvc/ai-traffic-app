import type { UserPersona } from "@/db/entities/UserPersona";
import type { UserZone, ZoneGeoRules } from "@/db/entities/UserZone";
import type { CampaignTargetingInput } from "@/lib/meta-campaign";
import type { AdSetDraftItem } from "@/lib/campaign-draft";
import { draftTargetingToApi } from "@/lib/campaign-draft";
import { mapMetaTargetingToDraft } from "@/lib/meta-adset-import";

export function personaToTargetingInput(persona: UserPersona): CampaignTargetingInput {
  const t = persona.targeting ?? {};
  const genders = t.genders as number[] | undefined;
  const locales = t.locales as number[] | undefined;

  const flexibleSpecs = t.flexible_spec as
    | Array<Record<string, Array<{ id: string; name?: string }>>>
    | undefined;

  return {
    ageMin: persona.ageMin,
    ageMax: persona.ageMax,
    genders: genders?.length
      ? genders
      : persona.gender === "male"
        ? [1]
        : persona.gender === "female"
          ? [2]
          : undefined,
    locales: locales?.length ? locales : undefined,
    flexibleSpecs: flexibleSpecs?.length ? flexibleSpecs : undefined
  };
}

export function zoneToTargetingInput(zone: UserZone): CampaignTargetingInput {
  const rules = zone.geoRules ?? {};
  return {
    countries: rules.countries?.length ? rules.countries : undefined,
    cities: rules.cities?.length ? rules.cities : undefined,
    customLocations: rules.customLocations?.length ? rules.customLocations : undefined
  };
}

export function mergeTargetingInputs(
  ...parts: (CampaignTargetingInput | undefined)[]
): CampaignTargetingInput {
  const merged: CampaignTargetingInput = {};
  for (const part of parts) {
    if (!part) continue;
    if (part.countries?.length) merged.countries = part.countries;
    if (part.cities?.length) merged.cities = part.cities;
    if (part.customLocations?.length) merged.customLocations = part.customLocations;
    if (part.ageMin != null) merged.ageMin = part.ageMin;
    if (part.ageMax != null) merged.ageMax = part.ageMax;
    if (part.genders?.length) merged.genders = part.genders;
    if (part.locales?.length) merged.locales = part.locales;
    if (part.interests?.length) merged.interests = part.interests;
    if (part.flexibleSpecs?.length) merged.flexibleSpecs = part.flexibleSpecs;
    if (part.advantageAudience != null) merged.advantageAudience = part.advantageAudience;
    if (part.customAudienceIds?.length) {
      merged.customAudienceIds = [
        ...new Set([...(merged.customAudienceIds ?? []), ...part.customAudienceIds])
      ];
    }
    if (part.excludedAudienceIds?.length) {
      merged.excludedAudienceIds = [
        ...new Set([...(merged.excludedAudienceIds ?? []), ...part.excludedAudienceIds])
      ];
    }
  }
  return merged;
}

export function compilePersonaZoneTargeting(
  persona: UserPersona,
  zone: UserZone,
  extras?: CampaignTargetingInput
): CampaignTargetingInput {
  return mergeTargetingInputs(personaToTargetingInput(persona), zoneToTargetingInput(zone), extras);
}

export function draftExtrasFromTargeting(adset: AdSetDraftItem): CampaignTargetingInput {
  const api = draftTargetingToApi(adset.targeting);
  return {
    customAudienceIds: api.customAudienceIds,
    excludedAudienceIds: api.excludedAudienceIds,
    advantageAudience: api.advantageAudience
  };
}

export function metaTargetingToCampaignInput(
  targeting: Record<string, unknown>
): CampaignTargetingInput {
  const draft = mapMetaTargetingToDraft(targeting);
  return draftTargetingToApi(draft);
}

export function zoneGeoRulesFromTargeting(targeting: Record<string, unknown>): ZoneGeoRules | null {
  const draft = mapMetaTargetingToDraft(targeting);
  const api = draftTargetingToApi(draft);
  if (!api.countries?.length && !api.cities?.length && !api.customLocations?.length) {
    return null;
  }
  return {
    countries: api.countries,
    cities: api.cities,
    customLocations: api.customLocations
  };
}
