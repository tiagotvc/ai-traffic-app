import "server-only";

import type { ClientActionSuggestion } from "@/db/entities/ClientActionSuggestion";
import { repositories } from "@/db/repositories";
import { recordTimelineEvent } from "@/lib/agency-brain/timeline-service";
import type {
  ActionPayload,
  ActionSuggestionDto,
  ActionSuggestionFilters,
  ActionSuggestionSummary,
  SuggestedActionDraft
} from "@/lib/action-suggestions/types";
import { MoreThanOrEqual, Not } from "typeorm";

const DEDUPE_WINDOW_DAYS = 30;

export function toActionSuggestionDto(row: ClientActionSuggestion): ActionSuggestionDto {
  return {
    id: row.id,
    clientId: row.clientId,
    metaCampaignId: row.metaCampaignId ?? null,
    linkedLearningId: row.linkedLearningId ?? null,
    title: row.title,
    description: row.description,
    actionType: row.actionType,
    actionPayload: (row.actionPayload as ActionPayload) ?? {},
    source: row.source,
    status: row.status,
    priority: row.priority,
    linkedLearningIds: row.linkedLearningIds ?? [],
    evidence: (row.evidence as ActionSuggestionDto["evidence"]) ?? null,
    resolvedByUserId: row.resolvedByUserId ?? null,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    resolutionNote: row.resolutionNote ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export async function listActionSuggestions(
  tenantId: string,
  clientId: string,
  filters: ActionSuggestionFilters = {}
): Promise<{ items: ActionSuggestionDto[]; total: number; page: number; pageSize: number }> {
  const { clientActionSuggestion: repo } = await repositories();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;

  const where: Record<string, unknown> = { tenantId, clientId };
  if (filters.status) where.status = filters.status;
  if (filters.actionType) where.actionType = filters.actionType;
  if (filters.source) where.source = filters.source;

  const [rows, total] = await repo.findAndCount({
    where,
    order: { createdAt: "DESC" },
    skip: (page - 1) * pageSize,
    take: pageSize
  });

  return { items: rows.map(toActionSuggestionDto), total, page, pageSize };
}

export async function getActionSuggestionSummary(
  tenantId: string,
  clientId: string
): Promise<ActionSuggestionSummary> {
  const { clientActionSuggestion: repo } = await repositories();
  const rows = await repo.find({ where: { tenantId, clientId } });
  return {
    pending: rows.filter((r) => r.status === "PENDING").length,
    executed: rows.filter((r) => r.status === "EXECUTED").length,
    acknowledged: rows.filter((r) => r.status === "ACKNOWLEDGED").length,
    rejected: rows.filter((r) => r.status === "REJECTED").length
  };
}

async function isDuplicate(
  tenantId: string,
  clientId: string,
  dedupeKey: string
): Promise<boolean> {
  const { clientActionSuggestion: repo } = await repositories();
  const since = new Date();
  since.setDate(since.getDate() - DEDUPE_WINDOW_DAYS);

  const existing = await repo.findOne({
    where: {
      tenantId,
      clientId,
      dedupeKey,
      createdAt: MoreThanOrEqual(since),
      status: Not("REJECTED" as const)
    }
  });

  return Boolean(existing);
}

export async function createActionSuggestion(
  tenantId: string,
  clientId: string,
  draft: SuggestedActionDraft
): Promise<ActionSuggestionDto | null> {
  if (await isDuplicate(tenantId, clientId, draft.dedupeKey)) {
    return null;
  }

  const { clientActionSuggestion: repo } = await repositories();
  const linkedIds = draft.linkedLearningIds?.length
    ? draft.linkedLearningIds
    : draft.linkedLearningId
      ? [draft.linkedLearningId]
      : [];

  const row = repo.create({
    tenantId,
    clientId,
    title: draft.title,
    description: draft.description,
    actionType: draft.actionType,
    actionPayload: draft.actionPayload,
    source: draft.source,
    status: "PENDING",
    priority: draft.priority ?? "MEDIUM",
    metaCampaignId: draft.metaCampaignId ?? null,
    linkedLearningId: linkedIds[0] ?? null,
    linkedLearningIds: linkedIds,
    evidence: draft.evidence,
    dedupeKey: draft.dedupeKey
  });
  const saved = await repo.save(row);
  return toActionSuggestionDto(saved);
}

async function resolveSuggestion(
  tenantId: string,
  clientId: string,
  suggestionId: string,
  status: ClientActionSuggestion["status"],
  userId?: string | null,
  note?: string | null
): Promise<ActionSuggestionDto | null> {
  const { clientActionSuggestion: repo } = await repositories();
  const row = await repo.findOne({ where: { id: suggestionId, tenantId, clientId } });
  if (!row) return null;

  row.status = status;
  row.resolvedByUserId = userId ?? null;
  row.resolvedAt = new Date();
  row.resolutionNote = note ?? null;
  const saved = await repo.save(row);
  return toActionSuggestionDto(saved);
}

export async function executeActionSuggestion(
  tenantId: string,
  clientId: string,
  suggestionId: string,
  userId?: string | null
): Promise<ActionSuggestionDto | null> {
  const { clientActionSuggestion: repo } = await repositories();
  const row = await repo.findOne({ where: { id: suggestionId, tenantId, clientId } });
  if (!row || row.status !== "PENDING") return null;

  const result = await resolveSuggestion(tenantId, clientId, suggestionId, "EXECUTED", userId, "Executado pelo app");
  if (result) {
    await recordTimelineEvent(tenantId, clientId, {
      type: "suggestion_executed",
      title: result.title,
      description: result.description,
      sourceId: result.id,
      sourceType: "suggestion",
      metadata: { priority: result.priority }
    });
  }
  return result;
}

export async function acknowledgeActionSuggestion(
  tenantId: string,
  clientId: string,
  suggestionId: string,
  userId?: string | null,
  note?: string | null
): Promise<ActionSuggestionDto | null> {
  return resolveSuggestion(
    tenantId,
    clientId,
    suggestionId,
    "ACKNOWLEDGED",
    userId,
    note ?? "Obrigado — farei manualmente"
  );
}

export async function rejectActionSuggestion(
  tenantId: string,
  clientId: string,
  suggestionId: string,
  userId?: string | null
): Promise<ActionSuggestionDto | null> {
  return resolveSuggestion(tenantId, clientId, suggestionId, "REJECTED", userId);
}

export async function getActionSuggestionById(
  tenantId: string,
  clientId: string,
  suggestionId: string
): Promise<ActionSuggestionDto | null> {
  const { clientActionSuggestion: repo } = await repositories();
  const row = await repo.findOne({ where: { id: suggestionId, tenantId, clientId } });
  return row ? toActionSuggestionDto(row) : null;
}
