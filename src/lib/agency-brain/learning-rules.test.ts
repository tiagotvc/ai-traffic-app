import { describe, expect, it } from "vitest";

import {
  avgCpa,
  avgCtr,
  buildDedupeKey,
  confidenceFromSample,
  evaluateAllRules,
  impactFromDelta,
  pctDelta,
  ruleAudienceCpa,
  ruleBudgetConcentration,
  ruleCpaWinner,
  ruleCtrWinner,
  ruleRoasLift,
  ruleSaturation,
  ruleSpendNoConversion
} from "@/lib/agency-brain/learning-rules";
import type { CampaignMetricsRow } from "@/lib/agency-brain/types";

const baseRow = (overrides: Partial<CampaignMetricsRow>): CampaignMetricsRow => ({
  metaCampaignId: "camp1",
  campaignName: "Test",
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

describe("learning-rules", () => {
  it("buildDedupeKey is stable", () => {
    expect(buildDedupeKey("cpa_winner", "client-1", "camp-1", 7)).toBe(
      "rule:cpa_winner:client-1:camp-1:7"
    );
  });

  it("impactFromDelta thresholds", () => {
    expect(impactFromDelta(-45)).toBe("HIGH");
    expect(impactFromDelta(-25)).toBe("MEDIUM");
    expect(impactFromDelta(-10)).toBe("LOW");
  });

  it("confidenceFromSample scales with data", () => {
    expect(confidenceFromSample(15, 600)).toBe("HIGH");
    expect(confidenceFromSample(5, 200)).toBe("MEDIUM");
    expect(confidenceFromSample(1, 50)).toBe("LOW");
  });

  it("pctDelta calculates percent change", () => {
    expect(pctDelta(75, 100)).toBe(-25);
    expect(pctDelta(130, 100)).toBe(30);
  });

  it("avgCpa and avgCtr aggregate rows", () => {
    const rows = [
      baseRow({ spend: 500, conversions: 10, cpa: 50 }),
      baseRow({ spend: 1500, conversions: 10, cpa: 150, metaCampaignId: "c2" })
    ];
    expect(avgCpa(rows)).toBe(100);
    expect(avgCtr(rows)).toBe(2);
  });

  it("ruleCpaWinner detects winner below average", () => {
    const rows = [
      baseRow({ metaCampaignId: "a", campaignName: "A", cpa: 50, conversions: 5 }),
      baseRow({ metaCampaignId: "b", campaignName: "B", cpa: 150, conversions: 5 })
    ];
    const draft = ruleCpaWinner(rows, "client-1", 7);
    expect(draft).not.toBeNull();
    expect(draft?.category).toBe("CREATIVE");
    expect(draft?.metaCampaignId).toBe("a");
  });

  it("ruleCtrWinner detects high CTR", () => {
    const rows = [
      baseRow({ metaCampaignId: "a", ctr: 4, clicks: 40, impressions: 1000 }),
      baseRow({ metaCampaignId: "b", ctr: 1, clicks: 10, impressions: 1000 })
    ];
    expect(ruleCtrWinner(rows, "client-1", 7)?.metaCampaignId).toBe("a");
  });

  it("evaluateAllRules uses signal analyzer for CPA efficient campaigns", () => {
    const rows = [
      baseRow({ metaCampaignId: "a", campaignName: "A", cpa: 50, conversions: 5 }),
      baseRow({ metaCampaignId: "b", campaignName: "B", cpa: 150, conversions: 5 })
    ];
    const previous = [
      baseRow({ metaCampaignId: "a", campaignName: "A", cpa: 100, conversions: 4 }),
      baseRow({ metaCampaignId: "b", campaignName: "B", cpa: 150, conversions: 5 })
    ];
    const drafts = evaluateAllRules(rows, previous, "client-1", 7);
    expect(drafts.some((d) => d.evidence.ruleId?.startsWith("signal_"))).toBe(true);
    expect(drafts.some((d) => d.metaCampaignId === "a")).toBe(true);
  });

  it("ruleSaturation returns up to 3 matches", () => {
    const rows = [
      baseRow({ metaCampaignId: "a", frequency: 4, ctr: 0.5, impressions: 2000 }),
      baseRow({ metaCampaignId: "b", frequency: 5, ctr: 0.4, impressions: 3000 }),
      baseRow({ metaCampaignId: "c", frequency: 6, ctr: 0.3, impressions: 4000 }),
      baseRow({ metaCampaignId: "d", frequency: 7, ctr: 0.2, impressions: 5000 })
    ];
    expect(ruleSaturation(rows, "client-1", 7)).toHaveLength(3);
  });

  it("ruleSpendNoConversion returns multiple high-spend rows", () => {
    const rows = [
      baseRow({ metaCampaignId: "a", spend: 600, conversions: 0 }),
      baseRow({ metaCampaignId: "b", spend: 700, conversions: 0 })
    ];
    expect(ruleSpendNoConversion(rows, "client-1", 7, 500)).toHaveLength(2);
  });

  it("ruleRoasLift compares periods", () => {
    const current = [baseRow({ metaCampaignId: "a", roas: 3 })];
    const previous = [baseRow({ metaCampaignId: "a", roas: 2 })];
    expect(ruleRoasLift(current, previous, "client-1", 7)).toHaveLength(1);
  });

  it("ruleBudgetConcentration flags spend concentration", () => {
    const rows = [
      baseRow({ metaCampaignId: "a", spend: 800 }),
      baseRow({ metaCampaignId: "b", spend: 200 })
    ];
    expect(ruleBudgetConcentration(rows, "client-1", 7)?.category).toBe("BUDGET");
  });

  it("ruleAudienceCpa still works standalone", () => {
    const rows = [
      baseRow({ metaCampaignId: "a", cpa: 40, conversions: 5 }),
      baseRow({ metaCampaignId: "b", cpa: 120, conversions: 5 })
    ];
    expect(ruleAudienceCpa(rows, "client-1", 7)?.category).toBe("AUDIENCE");
  });
});
