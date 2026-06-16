import "server-only";

import type { ClientHypothesis } from "@/db/entities/ClientHypothesis";
import type { LearningCategory } from "@/db/entities/ClientLearning";
import { repositories } from "@/db/repositories";
import type { HypothesisDto } from "@/lib/agency-brain/domain/schemas";
import { evaluateHypothesisRules, type SuggestedHypothesisDraft } from "@/lib/agency-brain/hypothesis-rules";
import { getClientCampaignMetricsWithComparison } from "@/lib/agency-brain/metrics-input";
import { createManualLearning } from "@/lib/agency-brain/client-learning-service";
import { recordTimelineEvent } from "@/lib/agency-brain/timeline-service";
import { In, MoreThanOrEqual, Not } from "typeorm";

const WINDOW_DAYS = 7;
const DEFAULT_SPEND_THRESHOLD = 500;
const DEDUPE_WINDOW_DAYS = 30;

export type HypothesisFilters = {
  status?: ClientHypothesis["status"];
  source?: ClientHypothesis["source"];
  category?: LearningCategory;
  page?: number;
  pageSize?: number;
};

export type CreateHypothesisInput = {
  title: string;
  description: string;
  category: LearningCategory;
  confidenceScore?: number;
  evidence?: Record<string, unknown> | null;
};

export function toHypothesisDto(row: ClientHypothesis): HypothesisDto {
  return {
    id: row.id,
    clientId: row.clientId,
    title: row.title,
    description: row.description,
    category: row.category,
    confidenceScore: row.confidenceScore,
    status: row.status,
    source: row.source,
    evidence: (row.evidence as HypothesisDto["evidence"]) ?? null,
    promotedLearningId: row.promotedLearningId ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export async function listHypotheses(
  tenantId: string,
  clientId: string,
  filters: HypothesisFilters = {}
): Promise<{ items: HypothesisDto[]; total: number; page: number; pageSize: number }> {
  const { clientHypothesis: repo } = await repositories();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;

  const where: Record<string, unknown> = { tenantId, clientId };
  if (filters.status) where.status = filters.status;
  if (filters.source) where.source = filters.source;
  if (filters.category) where.category = filters.category;

  const [rows, total] = await repo.findAndCount({
    where,
    order: { createdAt: "DESC" },
    skip: (page - 1) * pageSize,
    take: pageSize
  });

  return { items: rows.map(toHypothesisDto), total, page, pageSize };
}

export async function getHypothesisById(
  tenantId: string,
  clientId: string,
  hypothesisId: string
): Promise<HypothesisDto | null> {
  const { clientHypothesis: repo } = await repositories();
  const row = await repo.findOne({ where: { id: hypothesisId, tenantId, clientId } });
  return row ? toHypothesisDto(row) : null;
}

async function hasActiveHypothesisDedupeKey(
  tenantId: string,
  clientId: string,
  dedupeKey: string
): Promise<boolean> {
  const { clientHypothesis: repo } = await repositories();
  const since = new Date();
  since.setDate(since.getDate() - DEDUPE_WINDOW_DAYS);

  const existing = await repo.findOne({
    where: {
      tenantId,
      clientId,
      dedupeKey,
      status: Not(In(["REJECTED", "PROMOTED"])),
      createdAt: MoreThanOrEqual(since)
    }
  });
  return !!existing;
}

export async function createHypothesisFromDraft(
  tenantId: string,
  clientId: string,
  draft: SuggestedHypothesisDraft,
  source: ClientHypothesis["source"] = "RULE"
): Promise<HypothesisDto | null> {
  if (await hasActiveHypothesisDedupeKey(tenantId, clientId, draft.dedupeKey)) {
    return null;
  }

  const { clientHypothesis: repo } = await repositories();
  const row = repo.create({
    tenantId,
    clientId,
    title: draft.title,
    description: draft.description,
    category: draft.category,
    confidenceScore: draft.confidenceScore,
    status: "SUGGESTED",
    source,
    evidence: draft.evidence,
    dedupeKey: draft.dedupeKey
  });
  const saved = await repo.save(row);
  return toHypothesisDto(saved);
}

export async function createManualHypothesis(
  tenantId: string,
  clientId: string,
  input: CreateHypothesisInput
): Promise<HypothesisDto> {
  const { clientHypothesis: repo } = await repositories();
  const row = repo.create({
    tenantId,
    clientId,
    title: input.title,
    description: input.description,
    category: input.category,
    confidenceScore: input.confidenceScore ?? 40,
    status: "SUGGESTED",
    source: "MANUAL",
    evidence: input.evidence ?? null
  });
  const saved = await repo.save(row);
  return toHypothesisDto(saved);
}

async function setHypothesisStatus(
  tenantId: string,
  clientId: string,
  hypothesisId: string,
  status: ClientHypothesis["status"]
): Promise<HypothesisDto | null> {
  const { clientHypothesis: repo } = await repositories();
  const row = await repo.findOne({ where: { id: hypothesisId, tenantId, clientId } });
  if (!row) return null;
  row.status = status;
  const saved = await repo.save(row);
  return toHypothesisDto(saved);
}

export const confirmHypothesis = (
  tenantId: string,
  clientId: string,
  hypothesisId: string
) => setHypothesisStatus(tenantId, clientId, hypothesisId, "CONFIRMED");

export const rejectHypothesis = (
  tenantId: string,
  clientId: string,
  hypothesisId: string
) => setHypothesisStatus(tenantId, clientId, hypothesisId, "REJECTED");

export async function promoteHypothesisToLearning(
  tenantId: string,
  clientId: string,
  hypothesisId: string
): Promise<{ hypothesis: HypothesisDto; learning: import("@/lib/agency-brain/types").LearningDto } | null> {
  const { clientHypothesis: repo } = await repositories();
  const row = await repo.findOne({ where: { id: hypothesisId, tenantId, clientId } });
  if (!row || row.status === "PROMOTED" || row.status === "REJECTED") return null;

  const evidence = (row.evidence ?? {}) as Record<string, unknown>;
  const tags = Array.isArray(evidence.tags)
    ? (evidence.tags as string[])
    : row.source === "AI"
      ? ["ai", "hypothesis"]
      : ["hypothesis"];

  const learning = await createManualLearning(tenantId, clientId, {
    title: row.title.replace(/^Hipótese:\s*/i, ""),
    description: row.description,
    category: row.category,
    impact: "MEDIUM",
    confidence: row.confidenceScore >= 50 ? "MEDIUM" : "LOW",
    confidenceScore: row.confidenceScore,
    tags,
    metricSnapshot: evidence.metricSnapshot as import("@/lib/agency-brain/types").MetricSnapshotPayload | null
  });

  row.status = "PROMOTED";
  row.promotedLearningId = learning.id;
  const saved = await repo.save(row);

  await recordTimelineEvent(tenantId, clientId, {
    type: "hypothesis_promoted",
    title: `Hipótese promovida: ${row.title}`,
    description: row.description.slice(0, 200),
    metadata: { hypothesisId: row.id, learningId: learning.id },
    sourceId: row.id,
    sourceType: "hypothesis"
  });

  return { hypothesis: toHypothesisDto(saved), learning };
}

export async function runHypothesisSuggestionsForClient(
  tenantId: string,
  clientId: string
): Promise<{ created: number; hypotheses: HypothesisDto[] }> {
  const { clientGoal: goalRepo } = await repositories();
  const goal = await goalRepo.findOne({ where: { clientId } });
  const spendThreshold =
    goal?.maxSpendWithoutConversion != null
      ? Number(goal.maxSpendWithoutConversion)
      : DEFAULT_SPEND_THRESHOLD;

  const { current, previous } = await getClientCampaignMetricsWithComparison(
    tenantId,
    clientId,
    WINDOW_DAYS
  );

  if (!current.length) {
    return { created: 0, hypotheses: [] };
  }

  const drafts = evaluateHypothesisRules(current, previous, clientId, WINDOW_DAYS, spendThreshold);
  const hypotheses: HypothesisDto[] = [];

  for (const draft of drafts) {
    const created = await createHypothesisFromDraft(tenantId, clientId, draft);
    if (created) hypotheses.push(created);
  }

  return { created: hypotheses.length, hypotheses };
}
