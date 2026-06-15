import "server-only";

import type { ClientLearning } from "@/db/entities/ClientLearning";
import { repositories } from "@/db/repositories";
import type {
  CreateLearningInput,
  LearningDto,
  LearningFilters,
  SuggestedLearningDraft,
  UpdateLearningInput
} from "@/lib/agency-brain/types";
import { In, MoreThanOrEqual, Not } from "typeorm";

export function toLearningDto(row: ClientLearning): LearningDto {
  return {
    id: row.id,
    clientId: row.clientId,
    metaCampaignId: row.metaCampaignId ?? null,
    metaAdId: row.metaAdId ?? null,
    creativeAssetId: row.creativeAssetId ?? null,
    title: row.title,
    description: row.description,
    category: row.category,
    impact: row.impact,
    confidence: row.confidence,
    source: row.source,
    status: row.status,
    tags: row.tags ?? [],
    metricSnapshot: (row.metricSnapshot as LearningDto["metricSnapshot"]) ?? null,
    evidence: (row.evidence as LearningDto["evidence"]) ?? null,
    createdByUserId: row.createdByUserId ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export async function listClientLearnings(
  tenantId: string,
  clientId: string,
  filters: LearningFilters = {}
): Promise<{ items: LearningDto[]; total: number; page: number; pageSize: number }> {
  const { clientLearning: repo } = await repositories();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;

  const where: Record<string, unknown> = { tenantId, clientId };
  if (filters.category) where.category = filters.category;
  if (filters.impact) where.impact = filters.impact;
  if (filters.confidence) where.confidence = filters.confidence;
  if (filters.source) where.source = filters.source;
  if (filters.status) where.status = filters.status;

  const qb = repo.createQueryBuilder("l").where(where);

  if (filters.search?.trim()) {
    const q = `%${filters.search.trim()}%`;
    qb.andWhere("(l.title ILIKE :q OR l.description ILIKE :q)", { q });
  }

  if (filters.tags?.length) {
    qb.andWhere("l.tags ?| array[:...tags]", { tags: filters.tags });
  }

  if (filters.dateFrom) {
    qb.andWhere("l.createdAt >= :dateFrom", { dateFrom: filters.dateFrom });
  }
  if (filters.dateTo) {
    qb.andWhere("l.createdAt <= :dateTo", { dateTo: filters.dateTo });
  }

  const total = await qb.getCount();
  const rows = await qb
    .orderBy("l.createdAt", "DESC")
    .skip((page - 1) * pageSize)
    .take(pageSize)
    .getMany();

  return { items: rows.map(toLearningDto), total, page, pageSize };
}

export async function getLearningById(
  tenantId: string,
  clientId: string,
  learningId: string
): Promise<LearningDto | null> {
  const { clientLearning: repo } = await repositories();
  const row = await repo.findOne({ where: { id: learningId, tenantId, clientId } });
  return row ? toLearningDto(row) : null;
}

export async function createManualLearning(
  tenantId: string,
  clientId: string,
  input: CreateLearningInput,
  createdByUserId?: string | null
): Promise<LearningDto> {
  const { clientLearning: repo } = await repositories();
  const row = repo.create({
    tenantId,
    clientId,
    title: input.title,
    description: input.description,
    category: input.category,
    impact: input.impact ?? "MEDIUM",
    confidence: input.confidence ?? "MEDIUM",
    source: "MANUAL",
    status: "APPROVED",
    tags: input.tags ?? [],
    metaCampaignId: input.metaCampaignId ?? null,
    metaAdId: input.metaAdId ?? null,
    creativeAssetId: input.creativeAssetId ?? null,
    metricSnapshot: input.metricSnapshot ?? null,
    createdByUserId: createdByUserId ?? null
  });
  const saved = await repo.save(row);
  return toLearningDto(saved);
}

export async function updateLearning(
  tenantId: string,
  clientId: string,
  learningId: string,
  input: UpdateLearningInput
): Promise<LearningDto | null> {
  const { clientLearning: repo } = await repositories();
  const row = await repo.findOne({ where: { id: learningId, tenantId, clientId } });
  if (!row) return null;

  if (input.title !== undefined) row.title = input.title;
  if (input.description !== undefined) row.description = input.description;
  if (input.category !== undefined) row.category = input.category;
  if (input.impact !== undefined) row.impact = input.impact;
  if (input.confidence !== undefined) row.confidence = input.confidence;
  if (input.tags !== undefined) row.tags = input.tags;
  if (input.metaCampaignId !== undefined) row.metaCampaignId = input.metaCampaignId;
  if (input.metaAdId !== undefined) row.metaAdId = input.metaAdId;
  if (input.creativeAssetId !== undefined) row.creativeAssetId = input.creativeAssetId;
  if (input.metricSnapshot !== undefined) row.metricSnapshot = input.metricSnapshot;

  const saved = await repo.save(row);
  return toLearningDto(saved);
}

async function setLearningStatus(
  tenantId: string,
  clientId: string,
  learningId: string,
  status: ClientLearning["status"]
): Promise<LearningDto | null> {
  const { clientLearning: repo } = await repositories();
  const row = await repo.findOne({ where: { id: learningId, tenantId, clientId } });
  if (!row) return null;
  row.status = status;
  const saved = await repo.save(row);
  return toLearningDto(saved);
}

export const approveLearning = (
  tenantId: string,
  clientId: string,
  learningId: string
) => setLearningStatus(tenantId, clientId, learningId, "APPROVED");

export const rejectLearning = (
  tenantId: string,
  clientId: string,
  learningId: string
) => setLearningStatus(tenantId, clientId, learningId, "REJECTED");

export const archiveLearning = (
  tenantId: string,
  clientId: string,
  learningId: string
) => setLearningStatus(tenantId, clientId, learningId, "ARCHIVED");

export async function deleteLearning(
  tenantId: string,
  clientId: string,
  learningId: string
): Promise<boolean> {
  const { clientLearning: repo } = await repositories();
  const result = await repo.delete({ id: learningId, tenantId, clientId });
  return (result.affected ?? 0) > 0;
}

export async function hasActiveDedupeKey(
  tenantId: string,
  clientId: string,
  dedupeKey: string
): Promise<boolean> {
  const { clientLearning: repo } = await repositories();
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const existing = await repo.findOne({
    where: {
      tenantId,
      clientId,
      dedupeKey,
      status: Not(In(["ARCHIVED", "REJECTED"])),
      createdAt: MoreThanOrEqual(since)
    }
  });
  return !!existing;
}

export async function createSuggestedLearning(
  tenantId: string,
  clientId: string,
  draft: SuggestedLearningDraft
): Promise<LearningDto | null> {
  if (await hasActiveDedupeKey(tenantId, clientId, draft.dedupeKey)) {
    return null;
  }

  const { clientLearning: repo } = await repositories();
  const row = repo.create({
    tenantId,
    clientId,
    title: draft.title,
    description: draft.description,
    category: draft.category,
    impact: draft.impact,
    confidence: draft.confidence,
    source: "RULE",
    status: "SUGGESTED",
    tags: draft.tags ?? [],
    metaCampaignId: draft.metaCampaignId ?? null,
    metaAdId: draft.metaAdId ?? null,
    metricSnapshot: draft.metricSnapshot ?? null,
    evidence: draft.evidence,
    dedupeKey: draft.dedupeKey
  });
  const saved = await repo.save(row);
  return toLearningDto(saved);
}

export async function listApprovedLearnings(
  tenantId: string,
  clientId: string,
  limit = 50
): Promise<LearningDto[]> {
  const { clientLearning: repo } = await repositories();
  const rows = await repo.find({
    where: { tenantId, clientId, status: "APPROVED" },
    order: { createdAt: "DESC" },
    take: limit
  });
  return rows.map(toLearningDto);
}
