import "server-only";

import type { ClientHypothesis } from "@/db/entities/ClientHypothesis";
import type { LearningCategory } from "@/db/entities/ClientLearning";
import { repositories } from "@/db/repositories";
import type { HypothesisDto } from "@/lib/agency-brain/domain/schemas";
import { evaluateHypothesisRules, type SuggestedHypothesisDraft } from "@/lib/agency-brain/hypothesis-rules";
import { loadClientSignals, type ClientSignalsContext } from "@/lib/agency-brain/client-signals";
import { signalsToHypothesisDrafts } from "@/lib/agency-brain/signal-mappers";
import { hasActiveSignalDedupe } from "@/lib/agency-brain/signal-dedupe";
import { createManualLearning } from "@/lib/agency-brain/client-learning-service";
import { createActionSuggestion } from "@/lib/action-suggestions/action-suggestion-service";
import type { SuggestedActionDraft } from "@/lib/action-suggestions/types";
import { slugify } from "@/lib/app-context";
import { recordTimelineEvent } from "@/lib/agency-brain/timeline-service";
import { rebuildClientDna } from "@/lib/agency-brain/dna-builder";
import {
  applyConfidenceScoreSort,
  applyCreatedAtSort,
  applyUpdatedAtSort
} from "@/lib/agency-brain/list-sort";
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
  sortBy?: "createdAt" | "updatedAt" | "confidenceScore";
  sortDir?: "asc" | "desc";
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
  const pageSize = filters.pageSize ?? 10;
  const sortBy = filters.sortBy ?? "createdAt";
  const sortDir = filters.sortDir ?? "desc";

  const where: Record<string, unknown> = { tenantId, clientId };
  if (filters.status) where.status = filters.status;
  if (filters.source) where.source = filters.source;
  if (filters.category) where.category = filters.category;

  const qb = repo.createQueryBuilder("h").where(where);

  const total = await qb.getCount();

  if (sortBy === "confidenceScore") {
    applyConfidenceScoreSort(qb, "h", sortDir);
  } else if (sortBy === "updatedAt") {
    applyUpdatedAtSort(qb, "h", sortDir);
  } else {
    applyCreatedAtSort(qb, "h", sortDir);
  }

  const rows = await qb
    .skip((page - 1) * pageSize)
    .take(pageSize)
    .getMany();

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

export async function confirmHypothesis(
  tenantId: string,
  clientId: string,
  hypothesisId: string
): Promise<HypothesisDto | null> {
  const { clientHypothesis: repo, client: clientRepo } = await repositories();
  const row = await repo.findOne({ where: { id: hypothesisId, tenantId, clientId } });
  if (!row) return null;

  row.status = "CONFIRMED";
  const saved = await repo.save(row);
  const dto = toHypothesisDto(saved);

  const evidence = (row.evidence ?? {}) as Record<string, unknown>;
  const metaCampaignId =
    (evidence.metaCampaignId as string | undefined) ?? undefined;

  if (metaCampaignId) {
    const client = await clientRepo.findOne({ where: { id: clientId, tenantId } });
    const clientSlug = client ? slugify(client.name) : clientId;

    let actionType: SuggestedActionDraft["actionType"] = "review_campaign";
    if (row.category === "BUDGET" || evidence.ruleId?.toString().includes("cpa")) {
      actionType = "scale_budget";
    }

    const draft: SuggestedActionDraft = {
      title: `Ação: ${row.title.replace(/^Hipótese:\s*/i, "")}`,
      description: row.description,
      actionType,
      actionPayload: {
        metaCampaignId,
        campaignName: (evidence.campaignName as string | undefined) ?? undefined,
        manualUrl: `/clients/${clientSlug}/campaigns?campaign=${encodeURIComponent(metaCampaignId)}`,
        checklist: ["Validar hipótese confirmada", "Executar no Meta", "Documentar resultado"]
      },
      source: "RULE",
      metaCampaignId,
      linkedHypothesisIds: [hypothesisId],
      priority: row.confidenceScore >= 50 ? "HIGH" : "MEDIUM",
      evidence: {
        ruleId: "hypothesis_confirmed",
        reason: "Hipótese confirmada pelo usuário",
        campaignName: evidence.campaignName as string | undefined
      },
      dedupeKey: `action:hypothesis_confirmed:${clientId}:${hypothesisId}`
    };

    await createActionSuggestion(tenantId, clientId, draft);
  }

  await recordTimelineEvent(tenantId, clientId, {
    type: "hypothesis_confirmed",
    title: `Hipótese confirmada: ${row.title}`,
    description: row.description.slice(0, 200),
    metadata: { hypothesisId: row.id, metaCampaignId },
    sourceId: row.id,
    sourceType: "hypothesis"
  });

  return dto;
}

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

  await rebuildClientDna(tenantId, clientId);

  return { hypothesis: toHypothesisDto(saved), learning };
}

export async function runHypothesisSuggestionsForClient(
  tenantId: string,
  clientId: string,
  preloaded?: ClientSignalsContext
): Promise<{ created: number; hypotheses: HypothesisDto[] }> {
  const ctx = preloaded ?? (await loadClientSignals(tenantId, clientId, WINDOW_DAYS));

  if (!ctx) {
    return { created: 0, hypotheses: [] };
  }

  const signalDrafts = signalsToHypothesisDrafts(ctx.signals, clientId, ctx.windowDays);
  const legacyDrafts = evaluateHypothesisRules(
    ctx.current,
    ctx.previous,
    clientId,
    ctx.windowDays,
    ctx.spendThreshold
  );

  const seen = new Set(signalDrafts.map((d) => d.dedupeKey));
  const drafts = [...signalDrafts];
  for (const draft of legacyDrafts) {
    if (!seen.has(draft.dedupeKey)) {
      seen.add(draft.dedupeKey);
      drafts.push(draft);
    }
  }

  const hypotheses: HypothesisDto[] = [];

  for (const draft of drafts) {
    const blocked = await hasActiveSignalDedupe(tenantId, clientId, draft.dedupeKey);
    if (blocked.learning) continue;
    const created = await createHypothesisFromDraft(tenantId, clientId, draft);
    if (created) hypotheses.push(created);
  }

  return { created: hypotheses.length, hypotheses };
}
