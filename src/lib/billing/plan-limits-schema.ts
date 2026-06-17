import { z } from "zod";

/** Zod schema shared by admin plan APIs — must include every PlanLimits key. */
export const planLimitsSchema = z.object({
  maxClients: z.number().int().min(0),
  maxAdAccounts: z.number().int().min(0),
  maxMembers: z.number().int().min(0),
  maxAutomationRules: z.number().int().min(0),
  maxAiRequestsPerMonth: z.number().int().min(0),
  maxScheduledReports: z.number().int().min(0),
  allowAutoSync: z.boolean(),
  allowLiveMeta: z.boolean(),
  allowCreativeMemoryAi: z.boolean(),
  allowAgencyBrainHypotheses: z.boolean(),
  allowAgencyBrainDna: z.boolean(),
  allowAgencyBrainTimeline: z.boolean(),
  allowAgencyBrainExperiments: z.boolean(),
  allowAgencyBrainActionPlans: z.boolean(),
  allowAgencyBrainChat: z.boolean(),
  allowNavCampaigns: z.boolean(),
  allowNavAudiences: z.boolean(),
  allowNavCreatives: z.boolean(),
  allowNavReports: z.boolean(),
  allowNavAlerts: z.boolean(),
  allowNavAutomations: z.boolean()
});
