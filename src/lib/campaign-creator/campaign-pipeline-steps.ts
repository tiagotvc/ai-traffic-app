import type { CreatorNode } from "@/lib/campaign-draft";

/** Scientist run once per draft (competitor + Meta Ad Library) — later steps read cache. */
export const COMPETITOR_UPFRONT_SCIENTIST = "competitor";

export type CampaignWizardPipelineConfig = {
  scientistIds: string[];
  runTesting: boolean;
  /** i18n key under campaignCreator */
  labelKey: string;
};

/**
 * Maps campaign creator wizard step → scientists allowed for that step.
 * Testing runs only on review; competitor is cached after the first campaign-step run.
 */
export function getCampaignWizardPipelineConfig(activeNode: CreatorNode): CampaignWizardPipelineConfig {
  switch (activeNode) {
    case "campaign":
      return {
        scientistIds: ["competitor", "trend", "consumer"],
        runTesting: false,
        labelKey: "researchPipelineCampaign"
      };
    case "adset":
      return {
        scientistIds: ["geo"],
        runTesting: false,
        labelKey: "researchPipelineAdset"
      };
    case "ad":
      return {
        scientistIds: ["trend", "consumer"],
        runTesting: false,
        labelKey: "researchPipelineAd"
      };
    case "review":
      return {
        scientistIds: [],
        runTesting: true,
        labelKey: "researchPipelineReview"
      };
    default:
      return {
        scientistIds: [COMPETITOR_UPFRONT_SCIENTIST],
        runTesting: false,
        labelKey: "researchPipelineCampaign"
      };
  }
}

/** Signature fragment for re-running pipeline when step-relevant draft fields change. */
export function campaignPipelineRunSignature(input: {
  clientId: string;
  objective: string;
  activeNode: CreatorNode;
  dailyBudgetBRL?: number;
}): string {
  const budget =
    input.activeNode === "campaign" ? String(input.dailyBudgetBRL ?? 0) : "";
  return `${input.clientId}|${input.objective}|${input.activeNode}|${budget}`;
}
