export const AI_WIZARD_GENERATION_STEPS = [
  "understandingAudience",
  "matchingMetaAudience",
  "understandingRegions",
  "placingRegionsOnMap",
  "writingAdCopy",
  "organizingStructure",
  "openingCreator"
] as const;

export type AiCampaignGenerationStep = (typeof AI_WIZARD_GENERATION_STEPS)[number];
