import { describe, expect, it } from "vitest";
import {
  GOOGLE_TABLE_DEFAULTS,
  googleDerivedMetrics,
  googleTableAvailableColumns,
  normalizeGoogleTableColumns
} from "./google-table-columns";

describe("google table columns", () => {
  it("uses table defaults when preferences are absent or invalid", () => {
    expect(normalizeGoogleTableColumns("campaigns", null)).toEqual(GOOGLE_TABLE_DEFAULTS.campaigns);
    expect(normalizeGoogleTableColumns("ads", ["unknown"])).toEqual(GOOGLE_TABLE_DEFAULTS.ads);
  });

  it("keeps valid columns in user order and removes duplicates", () => {
    expect(normalizeGoogleTableColumns("adGroups", ["costPerConversion", "clicks", "costPerConversion", "type"])).toEqual([
      "costPerConversion",
      "clicks"
    ]);
  });

  it("exposes only attributes supported by each table", () => {
    expect(googleTableAvailableColumns("campaigns")).toContain("channelType");
    expect(googleTableAvailableColumns("ads")).toContain("type");
    expect(googleTableAvailableColumns("adGroups")).not.toContain("type");
  });

  it("calculates derived conversion metrics safely", () => {
    expect(googleDerivedMetrics({ clicks: 20, cost: 100, conversions: 4, conversionValue: 300 })).toMatchObject({
      conversionRate: 0.2,
      costPerConversion: 25,
      valuePerConversion: 75,
      roas: 3
    });
    expect(googleDerivedMetrics({ clicks: 0, cost: 0, conversions: 0 })).toMatchObject({
      conversionRate: 0,
      costPerConversion: 0,
      valuePerConversion: 0,
      roas: 0
    });
  });
});
