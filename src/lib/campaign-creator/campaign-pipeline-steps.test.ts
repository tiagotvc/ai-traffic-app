import { describe, expect, it } from "vitest";

import {
  campaignPipelineRunSignature,
  getCampaignWizardPipelineConfig
} from "@/lib/campaign-creator/campaign-pipeline-steps";

describe("campaign-pipeline-steps", () => {
  it("maps wizard steps to scientists", () => {
    expect(getCampaignWizardPipelineConfig("campaign").scientistIds).toEqual([
      "competitor",
      "trend",
      "consumer"
    ]);
    expect(getCampaignWizardPipelineConfig("adset").scientistIds).toEqual(["geo"]);
    expect(getCampaignWizardPipelineConfig("review").runTesting).toBe(true);
    expect(getCampaignWizardPipelineConfig("review").scientistIds).toEqual([]);
  });

  it("includes budget in campaign-step signature only", () => {
    const base = { clientId: "c1", objective: "leads" };
    expect(campaignPipelineRunSignature({ ...base, activeNode: "campaign", dailyBudgetBRL: 50 })).toBe(
      "c1|leads|campaign|50"
    );
    expect(campaignPipelineRunSignature({ ...base, activeNode: "adset", dailyBudgetBRL: 50 })).toBe(
      "c1|leads|adset|"
    );
  });
});
