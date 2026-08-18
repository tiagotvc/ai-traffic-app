import { describe, expect, it } from "vitest";

import { resolveTenantName } from "./tenant-name";

describe("resolveTenantName", () => {
  it("does not collapse unrelated users from the same email provider", () => {
    expect(resolveTenantName("rudney.carreira@gmail.com")).not.toBe(
      resolveTenantName("ilustreave@gmail.com")
    );
  });

  it("normalizes casing and surrounding whitespace", () => {
    expect(resolveTenantName("  User@Gmail.com ")).toBe("Workspace user@gmail.com");
  });

  it("keeps Meta-only accounts isolated by profile id", () => {
    expect(resolveTenantName("meta-123@traffic-ai.local", "123")).toBe(
      "Workspace Meta 123"
    );
  });
});
