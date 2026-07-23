import { describe, expect, it } from "vitest";

import {
  BIDDING_STRATEGY_API_FIELD,
  biddingRequiresConversionTracking,
  campaignRequiresConversionTracking,
  channelsForObjective,
  defaultChannelForObjective,
  deriveGoogleAdsCampaignConfig,
  GOOGLE_ADS_OBJECTIVES,
  isChannelAllowedForObjective,
  objectiveSupportsPerformanceMax,
  type GoogleAdsBiddingStrategy,
  type GoogleAdsChannelType,
  type GoogleAdsObjectiveKey
} from "@/lib/google-ads-campaign-rules";

const OBJECTIVES: GoogleAdsObjectiveKey[] = [...GOOGLE_ADS_OBJECTIVES];
const CHANNELS: GoogleAdsChannelType[] = ["SEARCH", "DISPLAY", "PERFORMANCE_MAX", "VIDEO", "DEMAND_GEN"];
const BIDDINGS: GoogleAdsBiddingStrategy[] = [
  "MAXIMIZE_CONVERSION_VALUE",
  "MAXIMIZE_CONVERSIONS",
  "MAXIMIZE_CLICKS",
  "TARGET_IMPRESSION_SHARE",
  "TARGET_CPM"
];

describe("deriveGoogleAdsCampaignConfig — golden cases (default channel)", () => {
  it("sales defaults to traditional Search optimizing conversion value (Pmax is opt-in)", () => {
    expect(deriveGoogleAdsCampaignConfig("sales")).toEqual({
      advertisingChannelType: "SEARCH",
      biddingStrategy: "MAXIMIZE_CONVERSION_VALUE",
      requiresConversionTracking: true
    });
  });

  it("leads default to Search maximizing conversions", () => {
    expect(deriveGoogleAdsCampaignConfig("leads")).toEqual({
      advertisingChannelType: "SEARCH",
      biddingStrategy: "MAXIMIZE_CONVERSIONS",
      requiresConversionTracking: true
    });
  });

  it("traffic defaults to Search maximizing clicks, no conversion tracking", () => {
    expect(deriveGoogleAdsCampaignConfig("traffic")).toEqual({
      advertisingChannelType: "SEARCH",
      biddingStrategy: "MAXIMIZE_CLICKS",
      requiresConversionTracking: false
    });
  });

  it("awareness defaults to Display on viewable CPM, no conversion tracking", () => {
    expect(deriveGoogleAdsCampaignConfig("awareness")).toEqual({
      advertisingChannelType: "DISPLAY",
      biddingStrategy: "TARGET_CPM",
      requiresConversionTracking: false
    });
  });
});

describe("deriveGoogleAdsCampaignConfig — channel-driven overrides", () => {
  it("Performance Max is always conversion-based, whatever the objective", () => {
    for (const objective of OBJECTIVES) {
      const c = deriveGoogleAdsCampaignConfig(objective, "PERFORMANCE_MAX");
      expect(c.advertisingChannelType).toBe("PERFORMANCE_MAX");
      expect(c.requiresConversionTracking).toBe(true);
      expect(["MAXIMIZE_CONVERSIONS", "MAXIMIZE_CONVERSION_VALUE"]).toContain(c.biddingStrategy);
    }
    // Only sales optimizes for value; the rest optimize for conversion count.
    expect(deriveGoogleAdsCampaignConfig("sales", "PERFORMANCE_MAX").biddingStrategy).toBe(
      "MAXIMIZE_CONVERSION_VALUE"
    );
    expect(deriveGoogleAdsCampaignConfig("leads", "PERFORMANCE_MAX").biddingStrategy).toBe(
      "MAXIMIZE_CONVERSIONS"
    );
  });

  it("awareness uses impression share on Search but viewable CPM elsewhere", () => {
    expect(deriveGoogleAdsCampaignConfig("awareness", "SEARCH").biddingStrategy).toBe(
      "TARGET_IMPRESSION_SHARE"
    );
    for (const ch of ["DISPLAY", "VIDEO", "DEMAND_GEN"] as GoogleAdsChannelType[]) {
      expect(deriveGoogleAdsCampaignConfig("awareness", ch).biddingStrategy).toBe("TARGET_CPM");
    }
  });
});

describe("deriveGoogleAdsCampaignConfig — invariants over the full matrix", () => {
  it("requiresConversionTracking agrees with the bidding strategy", () => {
    for (const objective of OBJECTIVES) {
      for (const channel of CHANNELS) {
        const c = deriveGoogleAdsCampaignConfig(objective, channel);
        expect(c.requiresConversionTracking).toBe(
          biddingRequiresConversionTracking(c.biddingStrategy)
        );
      }
    }
  });

  it("never returns an empty channel or bidding strategy", () => {
    for (const objective of OBJECTIVES) {
      for (const channel of CHANNELS) {
        const c = deriveGoogleAdsCampaignConfig(objective, channel);
        expect(c.advertisingChannelType).toBeTruthy();
        expect(c.biddingStrategy).toBeTruthy();
      }
    }
  });

  it("passing a channel is honored (config reports the channel it was given)", () => {
    for (const objective of OBJECTIVES) {
      for (const channel of CHANNELS) {
        expect(deriveGoogleAdsCampaignConfig(objective, channel).advertisingChannelType).toBe(
          channel
        );
      }
    }
  });

  it("campaignRequiresConversionTracking mirrors the derived config", () => {
    for (const objective of OBJECTIVES) {
      for (const channel of CHANNELS) {
        expect(campaignRequiresConversionTracking(objective, channel)).toBe(
          deriveGoogleAdsCampaignConfig(objective, channel).requiresConversionTracking
        );
      }
    }
  });
});

describe("channelsForObjective / defaultChannelForObjective", () => {
  it("every objective's default channel is itself allowed", () => {
    for (const objective of OBJECTIVES) {
      const def = defaultChannelForObjective(objective);
      expect(channelsForObjective(objective)).toContain(def);
      expect(isChannelAllowedForObjective(objective, def)).toBe(true);
    }
  });

  it("the default config for every allowed channel is fully populated", () => {
    for (const objective of OBJECTIVES) {
      for (const channel of channelsForObjective(objective)) {
        const c = deriveGoogleAdsCampaignConfig(objective, channel);
        expect(c.biddingStrategy).toBeTruthy();
        expect(c.advertisingChannelType).toBe(channel);
      }
    }
  });

  it("Performance Max is offered only to sales and leads (conversion objectives)", () => {
    expect(channelsForObjective("sales")).toContain("PERFORMANCE_MAX");
    expect(channelsForObjective("leads")).toContain("PERFORMANCE_MAX");
    expect(channelsForObjective("traffic")).not.toContain("PERFORMANCE_MAX");
    expect(channelsForObjective("awareness")).not.toContain("PERFORMANCE_MAX");
  });

  it("the default channel is NEVER Performance Max — Pmax is always opt-in", () => {
    for (const objective of OBJECTIVES) {
      expect(defaultChannelForObjective(objective)).not.toBe("PERFORMANCE_MAX");
    }
  });

  it("objectiveSupportsPerformanceMax matches the channel list (the UI toggle)", () => {
    for (const objective of OBJECTIVES) {
      expect(objectiveSupportsPerformanceMax(objective)).toBe(
        channelsForObjective(objective).includes("PERFORMANCE_MAX")
      );
    }
    expect(objectiveSupportsPerformanceMax("sales")).toBe(true);
    expect(objectiveSupportsPerformanceMax("leads")).toBe(true);
    expect(objectiveSupportsPerformanceMax("traffic")).toBe(false);
    expect(objectiveSupportsPerformanceMax("awareness")).toBe(false);
  });
});

describe("BIDDING_STRATEGY_API_FIELD", () => {
  it("maps every bidding strategy to a non-empty API field", () => {
    for (const bidding of BIDDINGS) {
      expect(BIDDING_STRATEGY_API_FIELD[bidding]).toBeTruthy();
    }
  });

  it("maximize clicks maps to targetSpend (no dedicated strategy in the API)", () => {
    expect(BIDDING_STRATEGY_API_FIELD.MAXIMIZE_CLICKS).toBe("targetSpend");
  });
});

describe("biddingRequiresConversionTracking", () => {
  it("only the two maximize-conversions strategies need conversion tracking", () => {
    for (const bidding of BIDDINGS) {
      const expected =
        bidding === "MAXIMIZE_CONVERSIONS" || bidding === "MAXIMIZE_CONVERSION_VALUE";
      expect(biddingRequiresConversionTracking(bidding)).toBe(expected);
    }
  });
});
