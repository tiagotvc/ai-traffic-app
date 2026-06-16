import { describe, expect, it } from "vitest";

import { validateAiLearningDraft } from "@/lib/agency-brain/ai-output-validator";
import type { CampaignMetricsRow } from "@/lib/agency-brain/types";

const row: CampaignMetricsRow = {
  metaCampaignId: "camp-1",
  campaignName: "Test",
  spend: 1000,
  conversions: 10,
  impressions: 10000,
  clicks: 200,
  reach: 5000,
  ctr: 2,
  cpa: 100,
  roas: 2,
  frequency: 2
};

describe("ai-output-validator", () => {
  it("rejects invented CPA numbers in text", () => {
    const result = validateAiLearningDraft(
      {
        title: "CPA alto",
        description: "CPA de R$ 7500 com spend elevado",
        category: "GENERAL",
        metaCampaignId: "camp-1"
      },
      [row]
    );
    expect(result.ok).toBe(false);
  });

  it("accepts draft when numbers align with metrics", () => {
    const result = validateAiLearningDraft(
      {
        title: "CPA estável",
        description: "CPA em torno de R$ 100 com 10 conversões",
        category: "GENERAL",
        metaCampaignId: "camp-1"
      },
      [row]
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.draft.confidenceScore).toBeGreaterThan(0);
    }
  });

  it("rejects unknown campaign id", () => {
    const result = validateAiLearningDraft(
      {
        title: "Campanha X",
        description: "Observação",
        category: "GENERAL",
        metaCampaignId: "missing"
      },
      [row]
    );
    expect(result.ok).toBe(false);
  });
});
