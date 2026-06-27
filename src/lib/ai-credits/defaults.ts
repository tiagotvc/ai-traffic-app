import type { AiCreditWeights, AiCreditsFeatureFlags } from "./types";

export const DEFAULT_AI_CREDITS_FEATURE_FLAGS: AiCreditsFeatureFlags = {
  creditsV2Enabled: false,
  tenantPolicyUiEnabled: false,
  perClientCapsEnabled: false,
  agentLayerEnabled: false
};

export const DEFAULT_AI_CREDIT_WEIGHTS: AiCreditWeights = {
  chat: 1,
  chat_with_proposals: 3,
  learnings: 1,
  actions: 1,
  hypotheses: 1,
  recommendations: 1,
  audience_suggestions: 1,
  campaign_generate: 2,
  creator_brain: 1,
  generic: 1
};

export const PLATFORM_SETTING_KEYS = {
  featureFlags: "ai_credits_feature_flags",
  weights: "ai_credit_weights"
} as const;

export const CM_AI_ACTION_TYPES = [
  "CM_AI_LEARNINGS",
  "CM_AI_ACTIONS",
  "AB_AI_HYPOTHESES",
  "AB_AI_CHAT"
] as const;
