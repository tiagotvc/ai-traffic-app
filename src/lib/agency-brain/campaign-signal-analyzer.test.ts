import { describe, expect, it } from "vitest";

import { analyzeClientCampaigns } from "@/lib/agency-brain/campaign-signal-analyzer";
import type { CampaignMetricsRow } from "@/lib/agency-brain/types";

const base = (overrides: Partial<CampaignMetricsRow>): CampaignMetricsRow => ({
  metaCampaignId: "c1",
  campaignName: "Clínica A",
  spend: 1200,
  conversions: 12,
  impressions: 20000,
  clicks: 400,
  reach: 8000,
  ctr: 2,
  cpa: 100,
  roas: 2.5,
  frequency: 2.2,
  ...overrides
});

describe("campaign-signal-analyzer", () => {
  it("flags strong CPA efficiency vs previous window", () => {
    const baseline30d = new Map([
      [
        "eff",
        {
          cpa: 100,
          ctr: 2,
          roas: 2.5,
          spend: 1000,
          conversions: 10,
          impressions: 20000,
          clicks: 400,
          reach: 8000,
          frequency: 2.2
        }
      ]
    ]);
    const current = [base({ metaCampaignId: "eff", cpa: 60, conversions: 8 })];
    const previous = [base({ metaCampaignId: "eff", cpa: 100, conversions: 6 })];
    const signals = analyzeClientCampaigns({
      clientId: "client",
      current,
      previous,
      baseline30d,
      goal: null,
      spendThreshold: 500,
      windowDays: 7
    });
    expect(signals.some((s) => s.type === "cpa_efficient" && s.tier === "strong")).toBe(true);
  });

  it("orders signals by priorityScore descending", () => {
    const current = [
      base({ metaCampaignId: "a", spend: 800, cpa: 50, conversions: 10 }),
      base({ metaCampaignId: "b", spend: 400, cpa: 120, conversions: 4 })
    ];
    const previous = [
      base({ metaCampaignId: "a", cpa: 100 }),
      base({ metaCampaignId: "b", cpa: 100 })
    ];
    const signals = analyzeClientCampaigns({
      clientId: "client",
      current,
      previous,
      goal: null,
      spendThreshold: 500,
      windowDays: 7
    });
    for (let i = 1; i < signals.length; i++) {
      expect(signals[i - 1]!.priorityScore).toBeGreaterThanOrEqual(signals[i]!.priorityScore);
    }
  });
});
