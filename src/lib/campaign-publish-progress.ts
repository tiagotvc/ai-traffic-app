export type CampaignPublishProgressStep =
  | "preparing"
  | "validatingPersonas"
  | "savingDraft"
  | "connectingMeta"
  | "creatingCampaign"
  | "creatingAdsets"
  | "creatingAds"
  | "syncing"
  | "publishingAdset"
  | "publishingAd";

export const META_PUBLISH_WAIT_CYCLE: CampaignPublishProgressStep[] = [
  "connectingMeta",
  "creatingCampaign",
  "creatingAdsets",
  "creatingAds"
];

/** Cycles status messages while waiting on a long Meta API request. */
export function startMetaPublishWaitCycle(
  onStep: (step: CampaignPublishProgressStep) => void,
  intervalMs = 3500
): () => void {
  let index = 0;
  onStep(META_PUBLISH_WAIT_CYCLE[0]!);
  const id = setInterval(() => {
    index = (index + 1) % META_PUBLISH_WAIT_CYCLE.length;
    onStep(META_PUBLISH_WAIT_CYCLE[index]!);
  }, intervalMs);
  return () => clearInterval(id);
}
