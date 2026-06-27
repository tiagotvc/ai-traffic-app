import { describe, expect, it } from "vitest";

import type { CreatorBrainInsightPayload } from "@/lib/campaign-creator/creator-brain-insights";
import {
  resolveConsultationCounts,
  resolveConsultedCampaignsCount,
  resolveMetaAdsConsultedCount,
  resolveSyncedCampaignsCount
} from "@/lib/campaign-creator/orion-brain-utils";

function baseInsight(
  overrides: Partial<CreatorBrainInsightPayload> = {}
): CreatorBrainInsightPayload {
  return {
    kind: "data",
    metric: "cpa",
    similarCampaignCount: 0,
    totalSampleCount: 0,
    confidence: 50,
    activeNode: "campaign",
    windowDays: 30,
    ...overrides
  };
}

describe("orion-brain-utils consultation counts", () => {
  it("returns matched samples when available", () => {
    const insight = baseInsight({
      totalSampleCount: 4,
      researchSteps: [
        { step: "client_campaigns", status: "done", count: 2 },
        { step: "agency_search", status: "done", count: 15 },
        { step: "agency_matched", status: "done", count: 2 },
        { step: "meta_competitor_search", status: "fallback", count: 0, detail: "objective_keywords_only" }
      ]
    });

    expect(resolveSyncedCampaignsCount(insight)).toBe(4);
    expect(resolveConsultedCampaignsCount(insight)).toBe(4);
  });

  it("falls back to agency scanned when no objective match", () => {
    const insight = baseInsight({
      agencySyncedCampaignCount: 15,
      researchSteps: [
        { step: "client_campaigns", status: "skipped", count: 0, detail: "no_client_selected" },
        { step: "agency_search", status: "done", count: 15 },
        { step: "agency_matched", status: "skipped", count: 0 },
        { step: "meta_competitor_search", status: "fallback", count: 3, detail: "objective_keywords_only" }
      ],
      metaAdsConsultedCount: 3
    });

    expect(resolveConsultationCounts(insight).agencySynced).toBe(15);
    expect(resolveSyncedCampaignsCount(insight)).toBe(15);
    expect(resolveConsultedCampaignsCount(insight)).toBe(15);
    expect(resolveMetaAdsConsultedCount(insight)).toBe(3);
  });

  it("uses meta ads for badge when only Ad Library was queried", () => {
    const insight = baseInsight({
      researchSteps: [
        { step: "client_campaigns", status: "skipped", count: 0, detail: "no_client_selected" },
        { step: "agency_search", status: "done", count: 0 },
        { step: "agency_matched", status: "skipped", count: 0 },
        { step: "meta_competitor_search", status: "done", count: 8, detail: "objective_keywords_only" }
      ],
      metaAdsConsultedCount: 8
    });

    expect(resolveSyncedCampaignsCount(insight)).toBe(0);
    expect(resolveConsultedCampaignsCount(insight)).toBe(8);
  });
});
