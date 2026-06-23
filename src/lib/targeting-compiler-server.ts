import "server-only";

import type { AdSetDraftItem } from "@/lib/campaign-draft";
import { draftTargetingToApi } from "@/lib/campaign-draft";
import { mapMetaTargetingToDraft } from "@/lib/meta-adset-import";
import {
  getClientSavedTargetingById,
  isLocalSavedTargetingId,
  parseLocalSavedTargetingId
} from "@/lib/client-saved-targeting";
import { repositories } from "@/db/repositories";
import type { CampaignTargetingInput } from "@/lib/meta-campaign";
import {
  compilePersonaZoneTargeting,
  draftExtrasFromTargeting,
  mergeTargetingInputs,
  metaTargetingToCampaignInput,
  personaToTargetingInput,
  zoneToTargetingInput
} from "@/lib/targeting-compiler";

export {
  compilePersonaZoneTargeting,
  draftExtrasFromTargeting,
  mergeTargetingInputs,
  metaTargetingToCampaignInput,
  personaToTargetingInput,
  zoneGeoRulesFromTargeting,
  zoneToTargetingInput
} from "@/lib/targeting-compiler";

export async function loadSavedTargetingSpec(args: {
  tenantId: string;
  metaSavedAudienceId: string;
  metaAccessToken?: string;
  adAccountId?: string;
}): Promise<Record<string, unknown> | null> {
  if (isLocalSavedTargetingId(args.metaSavedAudienceId)) {
    const localId = parseLocalSavedTargetingId(args.metaSavedAudienceId);
    if (!localId) return null;
    const row = await getClientSavedTargetingById({ tenantId: args.tenantId, id: localId });
    return row?.targeting ?? null;
  }

  if (!args.metaAccessToken || !args.adAccountId) return null;
  const { fetchSavedAudiences } = await import("@/lib/meta-audience-create");
  const audiences = await fetchSavedAudiences(args.metaAccessToken, args.adAccountId);
  const found = audiences.find((a) => a.id === args.metaSavedAudienceId);
  return (found?.targeting as Record<string, unknown>) ?? null;
}

export async function compileAdsetTargetingInput(args: {
  adset: AdSetDraftItem;
  tenantId: string;
  userId: string;
  metaAccessToken?: string;
  adAccountId?: string;
}): Promise<CampaignTargetingInput | null> {
  const { adset, tenantId, userId } = args;
  const mode = adset.targetingMode ?? "compiler";
  const extras = draftExtrasFromTargeting(adset);

  if (mode === "advanced") {
    const api = draftTargetingToApi(adset.targeting);
    return Object.keys(api).length ? api : null;
  }

  const { userPersona, userZone } = await repositories();

  if (mode === "meta_saved") {
    let base: CampaignTargetingInput | undefined;
    if (adset.metaSavedAudienceId) {
      const spec = await loadSavedTargetingSpec({
        tenantId,
        metaSavedAudienceId: adset.metaSavedAudienceId,
        metaAccessToken: args.metaAccessToken,
        adAccountId: args.adAccountId
      });
      if (spec) base = metaTargetingToCampaignInput(spec);
    }
    if (!base && adset.targeting.customAudienceIds.length) {
      base = { customAudienceIds: adset.targeting.customAudienceIds };
    }
    if (!base) return null;

    let zonePart: CampaignTargetingInput | undefined;
    if (adset.zoneId) {
      const zone = await userZone.findOne({
        where: { id: adset.zoneId, tenantId, userId }
      });
      if (zone) zonePart = zoneToTargetingInput(zone);
    }
    return mergeTargetingInputs(base, zonePart, extras);
  }

  let personaPart: CampaignTargetingInput | undefined;
  let zonePart: CampaignTargetingInput | undefined;

  if (adset.personaId) {
    const persona = await userPersona.findOne({
      where: { id: adset.personaId, tenantId, userId }
    });
    if (persona) personaPart = personaToTargetingInput(persona);
  }
  if (adset.zoneId) {
    const zone = await userZone.findOne({
      where: { id: adset.zoneId, tenantId, userId }
    });
    if (zone) zonePart = zoneToTargetingInput(zone);
  }

  if (personaPart && zonePart) {
    const persona = await userPersona.findOne({
      where: { id: adset.personaId!, tenantId, userId }
    });
    const zone = await userZone.findOne({
      where: { id: adset.zoneId!, tenantId, userId }
    });
    if (persona && zone) return compilePersonaZoneTargeting(persona, zone, extras);
  }

  if (personaPart || zonePart) {
    return mergeTargetingInputs(personaPart, zonePart, extras);
  }

  const manual = draftTargetingToApi(adset.targeting);
  return Object.keys(manual).length ? mergeTargetingInputs(manual, extras) : null;
}
