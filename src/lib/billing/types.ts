export type PaymentProvider = "asaas" | "stripe";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "suspended"
  | "canceled";

export type BillingCycle = "monthly" | "yearly";

export type InvoiceStatus =
  | "pending"
  | "confirmed"
  | "paid"
  | "overdue"
  | "refunded"
  | "partially_refunded"
  | "chargeback"
  | "canceled";

export type NfStatus = "pending" | "issued" | "error" | "not_applicable";

export type BillingJobStatus = "pending" | "processing" | "done" | "failed";

export type RefundRequestStatus = "pending" | "approved" | "rejected" | "processed";

export type PlanLimits = {
  maxClients: number;
  maxAdAccounts: number;
  maxMembers: number;
  maxAutomationRules: number;
  maxAiRequestsPerMonth: number;
  maxScheduledReports: number;
  /** Commander — acesso aos Scientists nos criadores (nome persistido legado). */
  allowCopilot: boolean;
  /** Orion Commander no Campaign Creator. */
  allowCommander: boolean;
  /** Quantos Scientists o Commander pode executar por rodada. */
  maxScientists: number;
  allowAutoSync: boolean;
  allowLiveMeta: boolean;
  allowCreativeMemoryAi: boolean;
  allowAgencyBrainHypotheses: boolean;
  allowAgencyBrainDna: boolean;
  allowAgencyBrainTimeline: boolean;
  allowAgencyBrainExperiments: boolean;
  allowAgencyBrainActionPlans: boolean;
  allowAgencyBrainChat: boolean;
  /** Menu visibility — configurable per plan in admin */
  allowNavCampaigns: boolean;
  allowNavAudiences: boolean;
  allowNavCreatives: boolean;
  allowNavReports: boolean;
  allowNavAlerts: boolean;
  allowNavAutomations: boolean;
  /** Dashboard V3 canvas — false keeps legacy fixed dashboard */
  allowDashboardCanvas: boolean;
  maxDashboards: number;
  maxDashboardWidgets: number;
  allowDashboardResize: boolean;
  allowDashboardAiWidgets: false | "basic" | "premium" | "advanced";
  allowDashboardAiBuilder: boolean;
  allowDashboardSharing: boolean;
  /** Custom brand name and logo in exports, reports and workspace chrome */
  allowWhiteLabel: boolean;
  /** Criador de Públicos Inteligente — quantos públicos/personas por IA o tenant pode gerar. -1 = ilimitado. */
  maxAudiencePersonas: number;
  /** Ranking de Criativos — configuração de ranking (src/app/api/creatives/ranking-config). */
  allowRankingConfig: boolean;
  /**
   * Orion Engine (Automações) — tier de funcionalidades, independente de `allowNavAutomations`
   * (que só liga/desliga o módulo). 1 = motor base (regras/templates/ações, paridade de mercado).
   * 2 = + simulação/backtest + modos de execução (alertar/aprovar/automático). 3 = + playbooks +
   * criação por IA. 4 = + agentes especialistas. Cada tier soma sobre o anterior; rebaixar o tier
   * nunca quebra regras existentes — o motor força `executionMode: "auto"` quando o tier não cobre.
   */
  automationTier: 1 | 2 | 3 | 4;
};

export type ExternalPrices = {
  asaas?: { monthlyCents?: number; yearlyCents?: number };
  stripe?: {
    priceIdMonthly?: string;
    priceIdYearly?: string;
  };
};

export const FREE_LIMITS: PlanLimits = {
  maxClients: 2,
  maxAdAccounts: 3,
  maxMembers: 1,
  maxAutomationRules: 0,
  maxAiRequestsPerMonth: 10,
  maxScheduledReports: 0,
  allowCopilot: false,
  allowCommander: false,
  maxScientists: 0,
  allowAutoSync: false,
  allowLiveMeta: false,
  allowCreativeMemoryAi: true,
  allowAgencyBrainHypotheses: true,
  allowAgencyBrainDna: true,
  allowAgencyBrainTimeline: false,
  allowAgencyBrainExperiments: false,
  allowAgencyBrainActionPlans: false,
  allowAgencyBrainChat: false,
  allowNavCampaigns: true,
  allowNavAudiences: false,
  allowNavCreatives: true,
  allowNavReports: false,
  allowNavAlerts: true,
  allowNavAutomations: false,
  allowDashboardCanvas: false,
  maxDashboards: 0,
  maxDashboardWidgets: 0,
  allowDashboardResize: false,
  allowDashboardAiWidgets: false,
  allowDashboardAiBuilder: false,
  allowDashboardSharing: false,
  allowWhiteLabel: false,
  maxAudiencePersonas: 2,
  allowRankingConfig: false,
  automationTier: 1
};

export const BASIC_LIMITS: PlanLimits = {
  maxClients: 3,
  maxAdAccounts: 10,
  maxMembers: 2,
  maxAutomationRules: 3,
  maxAiRequestsPerMonth: 30,
  maxScheduledReports: 1,
  allowCopilot: false,
  allowCommander: false,
  maxScientists: 0,
  allowAutoSync: true,
  allowLiveMeta: false,
  allowCreativeMemoryAi: true,
  allowAgencyBrainHypotheses: true,
  allowAgencyBrainDna: true,
  allowAgencyBrainTimeline: false,
  allowAgencyBrainExperiments: false,
  allowAgencyBrainActionPlans: false,
  allowAgencyBrainChat: false,
  allowNavCampaigns: true,
  allowNavAudiences: true,
  allowNavCreatives: true,
  allowNavReports: true,
  allowNavAlerts: true,
  allowNavAutomations: false,
  allowDashboardCanvas: false,
  maxDashboards: 0,
  maxDashboardWidgets: 0,
  allowDashboardResize: false,
  allowDashboardAiWidgets: false,
  allowDashboardAiBuilder: false,
  allowDashboardSharing: false,
  allowWhiteLabel: false,
  maxAudiencePersonas: 5,
  allowRankingConfig: false,
  automationTier: 1
};

export const ADVANCED_LIMITS: PlanLimits = {
  maxClients: 10,
  maxAdAccounts: 30,
  maxMembers: 5,
  maxAutomationRules: 10,
  maxAiRequestsPerMonth: 100,
  maxScheduledReports: 5,
  allowCopilot: true,
  allowCommander: true,
  maxScientists: 2,
  allowAutoSync: true,
  allowLiveMeta: true,
  allowCreativeMemoryAi: true,
  allowAgencyBrainHypotheses: true,
  allowAgencyBrainDna: true,
  allowAgencyBrainTimeline: true,
  allowAgencyBrainExperiments: true,
  allowAgencyBrainActionPlans: true,
  allowAgencyBrainChat: true,
  allowNavCampaigns: true,
  allowNavAudiences: true,
  allowNavCreatives: true,
  allowNavReports: true,
  allowNavAlerts: true,
  allowNavAutomations: true,
  allowDashboardCanvas: true,
  maxDashboards: 3,
  maxDashboardWidgets: 20,
  allowDashboardResize: true,
  allowDashboardAiWidgets: "basic",
  allowDashboardAiBuilder: false,
  allowDashboardSharing: false,
  allowWhiteLabel: true,
  maxAudiencePersonas: -1,
  allowRankingConfig: true,
  automationTier: 2
};

export const AGENCY_LIMITS: PlanLimits = {
  maxClients: 50,
  maxAdAccounts: 150,
  maxMembers: 15,
  maxAutomationRules: 50,
  maxAiRequestsPerMonth: 500,
  maxScheduledReports: 20,
  allowCopilot: true,
  allowCommander: true,
  maxScientists: 5,
  allowAutoSync: true,
  allowLiveMeta: true,
  allowCreativeMemoryAi: true,
  allowAgencyBrainHypotheses: true,
  allowAgencyBrainDna: true,
  allowAgencyBrainTimeline: true,
  allowAgencyBrainExperiments: true,
  allowAgencyBrainActionPlans: true,
  allowAgencyBrainChat: true,
  allowNavCampaigns: true,
  allowNavAudiences: true,
  allowNavCreatives: true,
  allowNavReports: true,
  allowNavAlerts: true,
  allowNavAutomations: true,
  allowDashboardCanvas: true,
  maxDashboards: 10,
  maxDashboardWidgets: 50,
  allowDashboardResize: true,
  allowDashboardAiWidgets: "premium",
  allowDashboardAiBuilder: false,
  allowDashboardSharing: true,
  allowWhiteLabel: true,
  maxAudiencePersonas: -1,
  allowRankingConfig: true,
  automationTier: 3
};

export const MASTER_LIMITS: PlanLimits = {
  ...AGENCY_LIMITS,
  maxDashboards: -1,
  maxDashboardWidgets: -1,
  allowDashboardAiWidgets: "advanced",
  allowDashboardAiBuilder: true,
  automationTier: 4
};

/** Full privileges for platform admins (bypasses tenant plan). */
export const PLATFORM_ADMIN_LIMITS: PlanLimits = {
  ...MASTER_LIMITS,
  maxClients: -1,
  maxAdAccounts: -1,
  maxMembers: -1,
  maxAutomationRules: -1,
  maxAiRequestsPerMonth: -1,
  maxScheduledReports: -1,
  maxAudiencePersonas: -1
};

/** @deprecated use ADVANCED_LIMITS */
export const PRO_LIMITS = ADVANCED_LIMITS;

export type PlanLimitKey = keyof PlanLimits;

export type TenantUsage = {
  clients: number;
  adAccounts: number;
  members: number;
  automationRules: number;
  aiRequestsThisMonth: number;
  scheduledReports: number;
  audiencePersonas: number;
};

export type Entitlements = {
  planSlug: string;
  planName: string;
  status: SubscriptionStatus;
  limits: PlanLimits;
  usage: TenantUsage;
  isPaid: boolean;
  canWrite: boolean;
};
