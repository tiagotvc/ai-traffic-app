import { describe, expect, it } from "vitest";

import {
  defaultConversionLocationForObjective,
  objectiveAllowsExistingPost,
  type CampaignObjectiveKey,
  type ConversionLocation
} from "@/lib/campaign-draft";
import {
  adsetRequiresPixel,
  adsetUsesPixel,
  conversionLocationsForObjective,
  deriveAdsetMetaConfig,
  isWebsiteLocation,
  objectiveAllowsWebsiteDestination
} from "@/lib/meta-campaign-rules";

const OBJECTIVES: CampaignObjectiveKey[] = [
  "awareness",
  "traffic",
  "engagement",
  "leads",
  "app",
  "sales"
];
const LOCATIONS: ConversionLocation[] = [
  "website",
  "website_and_form",
  "instant_form",
  "messaging",
  "calls",
  "app"
];

describe("deriveAdsetMetaConfig — golden cases", () => {
  it("sales always optimizes for website conversions with a pixel source", () => {
    for (const loc of ["website", "website_and_form"] as ConversionLocation[]) {
      for (const hasPixel of [true, false]) {
        const c = deriveAdsetMetaConfig("sales", loc, hasPixel);
        expect(c).toEqual({
          optimizationGoal: "OFFSITE_CONVERSIONS",
          destinationType: "WEBSITE",
          source: "pixel"
        });
      }
    }
  });

  it("leads to a website use the pixel when present, otherwise a lead form", () => {
    for (const loc of ["website", "website_and_form"] as ConversionLocation[]) {
      expect(deriveAdsetMetaConfig("leads", loc, true)).toEqual({
        optimizationGoal: "OFFSITE_CONVERSIONS",
        destinationType: "WEBSITE",
        source: "pixel"
      });
      expect(deriveAdsetMetaConfig("leads", loc, false)).toEqual({
        optimizationGoal: "LEAD_GENERATION",
        destinationType: "WEBSITE",
        source: "lead_form"
      });
    }
  });

  it("instant forms are on-ad lead generation regardless of objective", () => {
    expect(deriveAdsetMetaConfig("leads", "instant_form", false)).toEqual({
      optimizationGoal: "LEAD_GENERATION",
      destinationType: "ON_AD",
      source: "lead_form"
    });
  });

  it("traffic to a website: conversions with a pixel, else link clicks", () => {
    expect(deriveAdsetMetaConfig("traffic", "website", true)).toEqual({
      optimizationGoal: "OFFSITE_CONVERSIONS",
      destinationType: "WEBSITE",
      source: "pixel"
    });
    expect(deriveAdsetMetaConfig("traffic", "website", false)).toEqual({
      optimizationGoal: "LINK_CLICKS",
      destinationType: "WEBSITE",
      source: "none"
    });
  });

  it("engagement/awareness never carry a conversion source, even with a pixel", () => {
    expect(deriveAdsetMetaConfig("engagement", "website", true)).toEqual({
      optimizationGoal: "POST_ENGAGEMENT",
      destinationType: "ON_POST",
      source: "none"
    });
    expect(deriveAdsetMetaConfig("awareness", "website", true)).toEqual({
      optimizationGoal: "REACH",
      destinationType: null,
      source: "none"
    });
  });

  it("location-driven goals (messaging/calls/app) override the objective", () => {
    for (const objective of OBJECTIVES) {
      expect(deriveAdsetMetaConfig(objective, "messaging", false)).toEqual({
        optimizationGoal: "CONVERSATIONS",
        destinationType: null,
        source: "messaging"
      });
      expect(deriveAdsetMetaConfig(objective, "calls", false)).toEqual({
        optimizationGoal: "QUALITY_CALL",
        destinationType: "PHONE_CALL",
        source: "calls"
      });
      expect(deriveAdsetMetaConfig(objective, "app", false)).toEqual({
        optimizationGoal: "APP_INSTALLS",
        destinationType: null,
        source: "app"
      });
    }
  });
});

describe("deriveAdsetMetaConfig — invariants over the full matrix", () => {
  it("OFFSITE_CONVERSIONS is produced if and only if the source is a pixel", () => {
    for (const objective of OBJECTIVES) {
      for (const loc of LOCATIONS) {
        for (const hasPixel of [true, false]) {
          const c = deriveAdsetMetaConfig(objective, loc, hasPixel);
          expect(c.optimizationGoal === "OFFSITE_CONVERSIONS").toBe(c.source === "pixel");
        }
      }
    }
  });

  it("never returns an empty optimization goal", () => {
    for (const objective of OBJECTIVES) {
      for (const loc of LOCATIONS) {
        for (const hasPixel of [true, false]) {
          expect(deriveAdsetMetaConfig(objective, loc, hasPixel).optimizationGoal).toBeTruthy();
        }
      }
    }
  });

  it("validation and mapping agree: when a pixel is required, the mapping uses a pixel source", () => {
    for (const objective of OBJECTIVES) {
      for (const loc of LOCATIONS) {
        if (adsetRequiresPixel(objective, loc)) {
          expect(deriveAdsetMetaConfig(objective, loc, true).source).toBe("pixel");
        }
      }
    }
  });
});

describe("adsetRequiresPixel", () => {
  it("sales requires a pixel on website locations, not on app/messaging/calls", () => {
    expect(adsetRequiresPixel("sales", "website")).toBe(true);
    expect(adsetRequiresPixel("sales", "website_and_form")).toBe(true);
    expect(adsetRequiresPixel("sales", "app")).toBe(false);
    expect(adsetRequiresPixel("sales", "messaging")).toBe(false);
    expect(adsetRequiresPixel("sales", "calls")).toBe(false);
  });

  it("leads require a pixel only on website locations", () => {
    expect(adsetRequiresPixel("leads", "website")).toBe(true);
    expect(adsetRequiresPixel("leads", "website_and_form")).toBe(true);
    expect(adsetRequiresPixel("leads", "instant_form")).toBe(false);
    expect(adsetRequiresPixel("leads", "messaging")).toBe(false);
  });

  it("engagement/awareness/traffic/app never force a pixel", () => {
    for (const objective of ["engagement", "awareness", "traffic", "app"] as CampaignObjectiveKey[]) {
      for (const loc of LOCATIONS) {
        expect(adsetRequiresPixel(objective, loc)).toBe(false);
      }
    }
  });
});

describe("conversionLocationsForObjective", () => {
  it("app objective allows only the app location", () => {
    expect(conversionLocationsForObjective("app")).toEqual(["app"]);
  });

  it("lead-form locations are leads-only", () => {
    for (const objective of OBJECTIVES) {
      const allowed = conversionLocationsForObjective(objective);
      const hasForm = allowed.includes("instant_form") || allowed.includes("website_and_form");
      expect(hasForm).toBe(objective === "leads");
    }
  });

  it("the app location is only offered to app/traffic/sales (never engagement/awareness/leads)", () => {
    expect(conversionLocationsForObjective("engagement")).not.toContain("app");
    expect(conversionLocationsForObjective("awareness")).not.toContain("app");
    expect(conversionLocationsForObjective("leads")).not.toContain("app");
    expect(conversionLocationsForObjective("traffic")).toContain("app");
    expect(conversionLocationsForObjective("sales")).toContain("app");
  });

  it("every objective's default conversion location is itself allowed", () => {
    for (const objective of OBJECTIVES) {
      const def = defaultConversionLocationForObjective(objective);
      expect(conversionLocationsForObjective(objective)).toContain(def);
    }
  });

  it("the resulting config for every allowed location never has an empty goal", () => {
    for (const objective of OBJECTIVES) {
      for (const loc of conversionLocationsForObjective(objective)) {
        expect(deriveAdsetMetaConfig(objective, loc, true).optimizationGoal).toBeTruthy();
      }
    }
  });
});

describe("objectiveAllowsExistingPost (creative-source gating)", () => {
  it("only engagement and awareness can promote an existing post", () => {
    for (const objective of OBJECTIVES) {
      const allowed = objective === "engagement" || objective === "awareness";
      expect(objectiveAllowsExistingPost(objective)).toBe(allowed);
    }
  });
});

describe("adsetUsesPixel (UI shows pixel + conversion event)", () => {
  it("only website-conversion objectives use a pixel; engagement/awareness never do", () => {
    expect(adsetUsesPixel("engagement", "website")).toBe(false);
    expect(adsetUsesPixel("awareness", "website")).toBe(false);
    expect(adsetUsesPixel("leads", "website")).toBe(true);
    expect(adsetUsesPixel("sales", "website")).toBe(true);
    expect(adsetUsesPixel("traffic", "website")).toBe(true);
    expect(adsetUsesPixel("leads", "messaging")).toBe(false);
    expect(adsetUsesPixel("sales", "app")).toBe(false);
  });
});

describe("objectiveAllowsWebsiteDestination (engagement #100 guard)", () => {
  it("only engagement forbids an off-site website destination", () => {
    for (const objective of OBJECTIVES) {
      expect(objectiveAllowsWebsiteDestination(objective)).toBe(objective !== "engagement");
    }
  });
});

describe("isWebsiteLocation", () => {
  it("matches website and website_and_form only", () => {
    expect(isWebsiteLocation("website")).toBe(true);
    expect(isWebsiteLocation("website_and_form")).toBe(true);
    expect(isWebsiteLocation("instant_form")).toBe(false);
    expect(isWebsiteLocation("messaging")).toBe(false);
    expect(isWebsiteLocation("app")).toBe(false);
  });
});