import type { AiCreditKind, AiCreditWeights, AiCreditsFeatureFlags } from "./types";

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
  creative_studio_generate: 8,
  persona_insights: 2,
  geo_insights: 3,
  report_ai_config: 3,
  commander_verdict: 2,
  market_learnings: 2
};

/** Rótulo legível por kind — usado no histórico/log de uso (settings) e no registro de crédito. */
export const AI_CREDIT_KIND_LABEL: Record<AiCreditKind, string> = {
  chat: "Agency Cortex (chat)",
  chat_with_proposals: "Agency Cortex (chat com propostas)",
  learnings: "Memória Criativa (learnings)",
  actions: "Memória Criativa (actions)",
  hypotheses: "Agency Cortex (hypotheses)",
  recommendations: "Recomendação",
  audience_suggestions: "Segmentação de público",
  campaign_generate: "Campanha gerada com IA",
  creator_brain: "Insight do Criador de Campanha",
  generic: "IA",
  campaign_publish: "Campanha publicada",
  adset_publish: "Conjunto publicado",
  ad_publish: "Anúncio publicado",
  persona_save: "Persona salva",
  zone_save: "Zona salva",
  creative_upload: "Criativo enviado",
  persona_generate: "Persona gerada com IA",
  zone_generate: "Zona gerada com IA",
  ad_copy_generate: "Copy gerada com IA",
  creative_variant_generate: "Variação de criativo gerada com IA",
  creative_studio_generate: "Estúdio Criativo (imagem + copy)",
  persona_insights: "Insight de persona",
  geo_insights: "Geo Scientist",
  report_ai_config: "Relatório por IA",
  commander_verdict: "Veredito do Commander",
  market_learnings: "Aprendizados de mercado"
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
