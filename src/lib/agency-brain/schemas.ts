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
