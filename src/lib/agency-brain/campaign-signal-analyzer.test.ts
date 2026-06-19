import { describe, expect, it } from "vitest";

import { analyzeClientCampaigns } from "@/lib/agency-brain/campaign-signal-analyzer";
import { signalsToLearningDrafts } from "@/lib/agency-brain/signal-mappers";
import type { CampaignMetricsRow } from "@/lib/agency-brain/types";

const baseRow = (overrides: Partial<CampaignMetricsRow>): CampaignMetricsRow => ({
  metaCampaignId: "camp1",
  campaignName: "Test Campaign",
  spend: 1000,
  conversions: 10,
  impressions: 10000,
  clicks: 200,
  reach: 5000,
  ctr: 2,
  cpa: 100,
  roas: 2,
  frequency: 2,
  ...overrides
});

describe("campaign-signal-analyzer refinements", () => {
  it("does not flag CPA efficient when current equals baseline", () => {
    const current = [baseRow({ metaCampaignId: "a", cpa: 20.62, conversions: 5 })];
    const previous = [baseRow({ metaCampaignId: "a", cpa: 20.62, conversions: 5 })];

    const signals = analyzeClientCampaigns({
      clientId: "client-1",
      current,
      previous,
      goal: null,
      spendThreshold: 500,
      windowDays: 7
    });

    expect(signals.some((s) => s.type === "cpa_efficient")).toBe(false);
  });

  it("aligns description delta with baseline values", () => {
    const current = [baseRow({ metaCampaignId: "a", cpa: 50, conversions: 8 })];
    const previous = [baseRow({ metaCampaignId: "a", cpa: 100, conversions: 8 })];

    const signals = analyzeClientCampaigns({
      clientId: "client-1",
      current,
      previous,
      goal: null,
      spendThreshold: 500,
      windowDays: 7
    });

    const drafts = signalsToLearningDrafts(signals, "client-1", 7);
    const cpaDraft = drafts.find((d) => d.evidence.ruleId === "signal_cpa_efficient");
    expect(cpaDraft).toBeDefined();
    expect(cpaDraft?.description).toContain("R$ 50.00");
    expect(cpaDraft?.description).toContain("R$ 100.00");
    expect(cpaDraft?.evidence.baselineValue).toBe(100);
    expect(cpaDraft?.evidence.actualValue).toBe(50);
  });

  it("keeps only the strongest signal per campaign", () => {
    const current = [
      baseRow({
        metaCampaignId: "a",
        campaignName: "A",
        cpa: 40,
        ctr: 5,
        conversions: 10,
        impressions: 5000
      })
    ];
    const previous = [baseRow({ metaCampaignId: "a", cpa: 100, ctr: 2, conversions: 10, impressions: 5000 })];

    const signals = analyzeClientCampaigns({
      clientId: "client-1",
      current,
      previous,
      goal: null,
      spendThreshold: 500,
      windowDays: 7
    });

    const forCampaign = signals.filter((s) => s.campaign.metaCampaignId === "a");
    expect(forCampaign).toHaveLength(1);
  });
});
