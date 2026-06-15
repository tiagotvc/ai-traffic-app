import { z } from "zod";

const learningCategory = z.enum(["CREATIVE", "AUDIENCE", "OFFER", "COPY", "GENERAL"]);
const impactLevel = z.enum(["HIGH", "MEDIUM", "LOW"]);
const confidenceLevel = z.enum(["HIGH", "MEDIUM", "LOW"]);
const actionType = z.enum([
  "scale_budget",
  "pause_campaign",
  "duplicate_audience",
  "refresh_creative",
  "review_campaign"
]);

export const AiLearningsResponseSchema = z.object({
  learnings: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().min(1).max(800),
        category: learningCategory,
        impact: impactLevel,
        confidence: confidenceLevel,
        tags: z.array(z.string().min(1).max(40)).max(8).optional(),
        metaCampaignId: z.string().nullable().optional(),
        campaignName: z.string().max(200).optional(),
        reason: z.string().max(400).optional()
      })
    )
    .max(5)
});

export const AiActionsResponseSchema = z.object({
  suggestions: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().min(1).max(800),
        actionType,
        metaCampaignId: z.string().nullable().optional(),
        campaignName: z.string().max(200).optional(),
        budgetIncreasePercent: z.number().min(5).max(50).optional(),
        reason: z.string().max(400).optional(),
        checklist: z.array(z.string().min(1).max(200)).max(6).optional()
      })
    )
    .max(5)
});

export type AiLearningsResponse = z.infer<typeof AiLearningsResponseSchema>;
export type AiActionsResponse = z.infer<typeof AiActionsResponseSchema>;
