import type { AdSetDraftItem } from "@/lib/campaign-draft";

/** Merge imported Meta ad set fields into the active draft ad set, preserving local identity choices. */
export function applyImportedToAdset(
  active: AdSetDraftItem,
  imported: Partial<AdSetDraftItem>
): AdSetDraftItem {
  const next: AdSetDraftItem = { ...active };

  if (imported.name) next.name = imported.name;
  if (imported.conversionLocation) next.conversionLocation = imported.conversionLocation;
  if (imported.messagingChannels) next.messagingChannels = [...imported.messagingChannels];
  if (imported.pixelId !== undefined) next.pixelId = imported.pixelId;
  if (imported.conversionEvent) next.conversionEvent = imported.conversionEvent;
  if (imported.dynamicCreative !== undefined) next.dynamicCreative = imported.dynamicCreative;
  if (imported.schedule) next.schedule = { ...imported.schedule };
  if (imported.targeting) next.targeting = { ...imported.targeting };
  if (imported.placements) next.placements = { ...imported.placements };

  if (!active.personaId && imported.personaId) next.personaId = imported.personaId;
  if (!active.zoneId && imported.zoneId) next.zoneId = imported.zoneId;
  if (!active.metaSavedAudienceId && imported.metaSavedAudienceId) {
    next.metaSavedAudienceId = imported.metaSavedAudienceId;
  }
  if (!active.metaSavedAudienceName && imported.metaSavedAudienceName) {
    next.metaSavedAudienceName = imported.metaSavedAudienceName;
  }

  return next;
}
