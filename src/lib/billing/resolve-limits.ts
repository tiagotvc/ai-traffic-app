import type { PlanLimits } from "./types";
import { FREE_LIMITS } from "./types";

type PlanLimitsSource = { limits?: Partial<PlanLimits> | null } | null;

/** Pure merge of stored plan limits with defaults — safe for client and server. */
export function resolveLimits(plan: PlanLimitsSource): PlanLimits {
  if (!plan?.limits) return FREE_LIMITS;
  const raw = plan.limits;
  return {
    ...FREE_LIMITS,
    ...raw,
    allowCommander: raw.allowCommander ?? false,
    allowCreativeMemoryAi: raw.allowCreativeMemoryAi ?? true,
    allowAgencyBrainHypotheses: raw.allowAgencyBrainHypotheses ?? true,
    allowAgencyBrainDna: raw.allowAgencyBrainDna ?? true,
    allowAgencyBrainTimeline: raw.allowAgencyBrainTimeline ?? false,
    allowAgencyBrainExperiments: raw.allowAgencyBrainExperiments ?? false,
    allowAgencyBrainActionPlans: raw.allowAgencyBrainActionPlans ?? false,
    allowAgencyBrainChat: raw.allowAgencyBrainChat ?? false,
    allowNavCampaigns: raw.allowNavCampaigns ?? true,
    allowNavAudiences: raw.allowNavAudiences ?? false,
    allowNavCreatives: raw.allowNavCreatives ?? true,
    allowNavReports: raw.allowNavReports ?? false,
    allowNavAlerts: raw.allowNavAlerts ?? true,
    allowNavAutomations: raw.allowNavAutomations ?? false,
    allowDashboardCanvas: raw.allowDashboardCanvas ?? false,
    maxDashboards: raw.maxDashboards ?? 0,
    maxDashboardWidgets: raw.maxDashboardWidgets ?? 0,
    allowDashboardResize: raw.allowDashboardResize ?? false,
    allowDashboardAiWidgets: raw.allowDashboardAiWidgets ?? false,
    allowDashboardAiBuilder: raw.allowDashboardAiBuilder ?? false,
    allowDashboardSharing: raw.allowDashboardSharing ?? false,
    // White-label (nome + logo custom em relatórios) é liberado em todos os planos —
    // não é mais um gate pago. Forçado true aqui p/ valer inclusive em planos cujo
    // registro no banco ainda tenha allowWhiteLabel=false.
    allowWhiteLabel: true,
    maxAudiencePersonas: raw.maxAudiencePersonas ?? -1,
    allowRankingConfig: raw.allowRankingConfig ?? true,
    automationTier: raw.automationTier ?? 1
  };
}
