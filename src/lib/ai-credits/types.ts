export type AiDistributionMode = "shared_pool" | "per_client_cap";

export type AiCreditKind =
  | "chat"
  | "chat_with_proposals"
  | "learnings"
  | "actions"
  | "hypotheses"
  | "recommendations"
  | "audience_suggestions"
  | "campaign_generate"
  | "generic";

export type AiCreditWeights = Record<AiCreditKind, number>;

export type AiCreditsFeatureFlags = {
  /** Master switch — when false, legacy 1-request=1-limit behavior. */
  creditsV2Enabled: boolean;
  /** Tenant settings tab for pool distribution. */
  tenantPolicyUiEnabled: boolean;
  /** Per-client cap fields in client settings. */
  perClientCapsEnabled: boolean;
  /** Future: chat → proposals → execute (P1 agent layer). */
  agentLayerEnabled: boolean;
};

export type TenantAiPolicyDto = {
  distributionMode: AiDistributionMode;
  alertThresholdPercent: number;
  reservePercent: number;
  defaultClientMonthlyCap: number | null;
  customWeights: Partial<AiCreditWeights> | null;
};

export type ClientAiSettingsDto = {
  aiEnabled: boolean;
  aiMonthlyCap: number | null;
};

export type AiCreditsUsageDto = {
  creditsUsed: number;
  creditsLimit: number;
  creditsRemaining: number;
  alertThresholdPercent: number;
  nearLimit: boolean;
  atLimit: boolean;
  byClient: Array<{
    clientId: string;
    clientName: string;
    creditsUsed: number;
    monthlyCap: number | null;
  }>;
};

export type AiCreditsStatusDto = {
  featureFlags: AiCreditsFeatureFlags;
  usage: AiCreditsUsageDto;
  policy: TenantAiPolicyDto;
  weights: AiCreditWeights;
};

export class AiCreditsError extends Error {
  code:
    | "AI_CREDITS_DISABLED"
    | "AI_CREDITS_TENANT_LIMIT"
    | "AI_CREDITS_CLIENT_LIMIT"
    | "AI_CREDITS_CLIENT_DISABLED"
    | "AI_CREDITS_FEATURE_OFF";
  constructor(
    code: AiCreditsError["code"],
    message: string
  ) {
    super(message);
    this.name = "AiCreditsError";
    this.code = code;
  }
}
