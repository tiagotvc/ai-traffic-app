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
  allowDashboardSharing: false
};

export const BASIC_LIMITS: PlanLimits = {
  maxClients: 3,
  maxAdAccounts: 10,
  maxMembers: 2,
  maxAutomationRules: 3,
  maxAiRequestsPerMonth: 30,
  maxScheduledReports: 1,
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
  allowDashboardSharing: false
};

export const ADVANCED_LIMITS: PlanLimits = {
  maxClients: 10,
  maxAdAccounts: 30,
  maxMembers: 5,
  maxAutomationRules: 10,
  maxAiRequestsPerMonth: 100,
  maxScheduledReports: 5,
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
  allowDashboardSharing: false
};

export const AGENCY_LIMITS: PlanLimits = {
  maxClients: 50,
  maxAdAccounts: 150,
  maxMembers: 15,
  maxAutomationRules: 50,
  maxAiRequestsPerMonth: 500,
  maxScheduledReports: 20,
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
  allowDashboardSharing: true
};

export const MASTER_LIMITS: PlanLimits = {
  ...AGENCY_LIMITS,
  maxDashboards: -1,
  maxDashboardWidgets: -1,
  allowDashboardAiWidgets: "advanced",
  allowDashboardAiBuilder: true
};

/** Full privileges for platform admins (bypasses tenant plan). */
export const PLATFORM_ADMIN_LIMITS: PlanLimits = {
  ...MASTER_LIMITS,
  maxClients: -1,
  maxAdAccounts: -1,
  maxMembers: -1,
  maxAutomationRules: -1,
  maxAiRequestsPerMonth: -1,
  maxScheduledReports: -1
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
