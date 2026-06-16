import { describe, expect, it } from "vitest";

import { getClientAdaptiveThresholds } from "@/lib/agency-brain/adaptive-thresholds";

describe("adaptive-thresholds", () => {
  it("uses looser thresholds for small weekly spend", () => {
    const small = getClientAdaptiveThresholds("c1", null, 400);
    const large = getClientAdaptiveThresholds("c1", null, 12000);
    expect(Math.abs(small.cpaStrongPct)).toBeLessThan(Math.abs(large.cpaStrongPct));
  });

  it("tightens CTR thresholds for high spend accounts", () => {
    const small = getClientAdaptiveThresholds("c1", null, 300);
    const large = getClientAdaptiveThresholds("c1", null, 15000);
    expect(large.ctrStrongPct).toBeGreaterThan(small.ctrStrongPct);
  });
});
