import { describe, expect, it } from "vitest";

import {
  avgCpa,
  avgCtr,
  buildDedupeKey,
  confidenceFromSample,
  impactFromDelta,
  pctDelta,
  ruleCpaWinner
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
    expect(draft?.dedupeKey).toContain("cpa_winner");
  });

  it("ruleCpaWinner returns null when no winner", () => {
    const rows = [baseRow({ cpa: 100 }), baseRow({ metaCampaignId: "b", cpa: 105 })];
    expect(ruleCpaWinner(rows, "client-1", 7)).toBeNull();
  });
});
