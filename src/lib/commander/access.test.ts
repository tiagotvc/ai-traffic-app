import { describe, expect, it } from "vitest";
import { canUseCommander } from "./access";

describe("canUseCommander", () => {
  it.each(["free", "basic", "basic-plus"])("mantém o resumo antigo no plano %s", (planSlug) => {
    expect(canUseCommander({
      planSlug, allowCommander: true, platformEnabled: true, environmentEnabled: true
    })).toBe(false);
  });

  it("libera planos elegíveis quando plano e flags permitem", () => {
    expect(canUseCommander({
      planSlug: "advanced", allowCommander: true, platformEnabled: true, environmentEnabled: true
    })).toBe(true);
  });

  it("mantém o resumo antigo quando qualquer kill-switch está desligado", () => {
    expect(canUseCommander({
      planSlug: "agency", allowCommander: true, platformEnabled: false, environmentEnabled: true
    })).toBe(false);
    expect(canUseCommander({
      planSlug: "agency", allowCommander: true, platformEnabled: true, environmentEnabled: false
    })).toBe(false);
  });
});
