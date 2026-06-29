import { describe, expect, it } from "vitest";

import {
  isFeatureEnabledForUser,
  resolveAllFeaturesForUser
} from "./registry";
import type { FeatureFlagConfigMap, FeatureFlagContext } from "./types";

const USER: FeatureFlagContext = { userId: "u-common", isPlatformAdmin: false };
const ADMIN: FeatureFlagContext = { userId: "u-admin", isPlatformAdmin: true };

describe("feature-flags rollout resolution", () => {
  it("default (no overrides) = global, enabled for everyone", () => {
    const flags: FeatureFlagConfigMap = {};
    expect(isFeatureEnabledForUser(flags, "brain", USER)).toBe(true);
    expect(isFeatureEnabledForUser(flags, "brain.chat", USER)).toBe(true);
    expect(isFeatureEnabledForUser(flags, "visions.canvas", USER)).toBe(true);
  });

  it("off on a module cascades to children (incl. admin)", () => {
    const flags: FeatureFlagConfigMap = { brain: { mode: "off" } };
    expect(isFeatureEnabledForUser(flags, "brain", USER)).toBe(false);
    expect(isFeatureEnabledForUser(flags, "brain.chat", USER)).toBe(false);
    // off é kill total — nem admin vê
    expect(isFeatureEnabledForUser(flags, "brain", ADMIN)).toBe(false);
    expect(isFeatureEnabledForUser(flags, "brain.dna", ADMIN)).toBe(false);
  });

  it("admin_only: só admin; herda nos filhos", () => {
    const flags: FeatureFlagConfigMap = { visions: { mode: "admin_only" } };
    expect(isFeatureEnabledForUser(flags, "visions", USER)).toBe(false);
    expect(isFeatureEnabledForUser(flags, "visions.canvas", USER)).toBe(false);
    expect(isFeatureEnabledForUser(flags, "visions", ADMIN)).toBe(true);
    expect(isFeatureEnabledForUser(flags, "visions.canvas", ADMIN)).toBe(true);
  });

  it("specific_users: só quem está na allowlist", () => {
    const flags: FeatureFlagConfigMap = {
      "campaigns.ai-generate": { mode: "specific_users", allowedUserIds: ["u-beta"] }
    };
    expect(isFeatureEnabledForUser(flags, "campaigns.ai-generate", { userId: "u-beta", isPlatformAdmin: false })).toBe(true);
    expect(isFeatureEnabledForUser(flags, "campaigns.ai-generate", USER)).toBe(false);
  });

  it("dependsOn: desligar a dependência desliga o dependente", () => {
    // brain.chat dependsOn brain.learnings
    const flags: FeatureFlagConfigMap = { "brain.learnings": { mode: "off" } };
    expect(isFeatureEnabledForUser(flags, "brain.learnings", USER)).toBe(false);
    expect(isFeatureEnabledForUser(flags, "brain.chat", USER)).toBe(false);
    // irmão sem dependência continua ligado
    expect(isFeatureEnabledForUser(flags, "brain.dna", USER)).toBe(true);
  });

  it("legado boolean: false = off, true = global", () => {
    expect(isFeatureEnabledForUser({ brain: false } as unknown as FeatureFlagConfigMap, "brain", USER)).toBe(false);
    expect(isFeatureEnabledForUser({ brain: true } as unknown as FeatureFlagConfigMap, "brain", USER)).toBe(true);
  });

  it("resolveAllFeaturesForUser cobre todo o registry e respeita off de módulo", () => {
    const map = resolveAllFeaturesForUser({ brain: { mode: "off" } }, USER);
    expect(map.brain).toBe(false);
    expect(map["brain.chat"]).toBe(false);
    expect(map.visions).toBe(true); // outro módulo intacto
  });
});
