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
  audience_suggestions: 2,
  campaign_generate: 5,
  creator_brain: 1,
  generic: 1,
  campaign_publish: 1,
  adset_publish: 1,
  ad_publish: 1,
  persona_save: 1,
  zone_save: 1,
  creative_upload: 2,
  persona_generate: 3,
  zone_generate: 3,
  ad_copy_generate: 2,
  creative_variant_generate: 4,
  persona_insights: 2,
  geo_insights: 3,
  report_ai_config: 3,
  commander_verdict: 2,
  market_learnings: 2
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
