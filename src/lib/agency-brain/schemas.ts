import { z } from "zod";

const categoryEnum = z.enum([
  "CREATIVE",
  "AUDIENCE",
  "OFFER",
  "COPY",
  "BUDGET",
  "LANDING_PAGE",
  "SEASONALITY",
  "GENERAL"
]);

const impactEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);
const confidenceEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);
const sourceEnum = z.enum(["MANUAL", "RULE", "AI", "IMPORTED"]);
const statusEnum = z.enum(["SUGGESTED", "APPROVED", "REJECTED", "ARCHIVED"]);

export const CreateLearningSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  category: categoryEnum,
  impact: impactEnum.optional(),
  confidence: confidenceEnum.optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  metaCampaignId: z.string().nullable().optional(),
  metaAdId: z.string().nullable().optional(),
  creativeAssetId: z.string().uuid().nullable().optional(),
  metricSnapshot: z.record(z.string(), z.unknown()).nullable().optional()
});

export const UpdateLearningSchema = CreateLearningSchema.partial();

export const ListLearningsQuerySchema = z.object({
  category: categoryEnum.optional(),
  impact: impactEnum.optional(),
  confidence: confidenceEnum.optional(),
  source: sourceEnum.optional(),
  status: statusEnum.optional(),
  search: z.string().optional(),
  tags: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional()
});

const hypothesisStatusEnum = z.enum(["SUGGESTED", "TESTING", "CONFIRMED", "REJECTED", "PROMOTED"]);
const hypothesisSourceEnum = z.enum(["RULE", "AI", "MANUAL"]);

export const CreateHypothesisSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  category: categoryEnum,
  confidenceScore: z.number().int().min(20).max(100).optional(),
  evidence: z.record(z.string(), z.unknown()).nullable().optional()
});

export const ListHypothesesQuerySchema = z.object({
  status: hypothesisStatusEnum.optional(),
  source: hypothesisSourceEnum.optional(),
  category: categoryEnum.optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional()
});

export const PatchClientDnaSchema = z.object({
  audiences: z.object({ works: z.array(z.string()), doesntWork: z.array(z.string()) }).optional(),
  creatives: z.object({ works: z.array(z.string()), doesntWork: z.array(z.string()) }).optional(),
  placements: z.object({ works: z.array(z.string()), doesntWork: z.array(z.string()) }).optional(),
  offers: z.object({ works: z.array(z.string()), doesntWork: z.array(z.string()) }).optional(),
  copy: z.object({ works: z.array(z.string()), doesntWork: z.array(z.string()) }).optional(),
  seasonality: z.object({ works: z.array(z.string()), doesntWork: z.array(z.string()) }).optional(),
  summaryText: z.string().max(5000).optional(),
  manualOverrides: z.record(z.string(), z.unknown()).optional()
});

export const ListTimelineQuerySchema = z.object({
  type: z
    .enum([
      "learning_approved",
      "learning_suggested",
      "hypothesis_promoted",
      "suggestion_executed",
      "suggestion_created",
      "metric_spike",
      "sync_completed"
    ])
    .optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional()
});

export const CreateExperimentSchema = z.object({
  title: z.string().min(1).max(200),
  variantA: z.string().min(1).max(500),
  variantB: z.string().min(1).max(500),
  hypothesisId: z.string().uuid().nullable().optional(),
  metrics: z.record(z.string(), z.unknown()).nullable().optional()
});

export const ListExperimentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional()
});

export const CreateActionPlanSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  suggestionIds: z.array(z.string().uuid()).optional(),
  items: z.array(z.string().min(1).max(200)).optional()
});

export const AgencyBrainChatSchema = z.object({
  message: z.string().min(1).max(2000)
});
