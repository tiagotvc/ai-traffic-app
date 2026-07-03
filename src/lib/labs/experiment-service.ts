import "server-only";

import { In } from "typeorm";

import type { LabsExperiment } from "@/db/entities/LabsExperiment";
import { repositories } from "@/db/repositories";
import { estimateCredits, type LabsAgentRunDto, type LabsExperimentDto } from "@/lib/labs/types";

/**
 * CRUD dos experimentos de pesquisa do Laboratory. Fase 3 (docs/orion-architecture §2.2):
 * acesso via TypeORM (`LabsExperiment`/`LabsAgentRun`) em vez de SQL cru. As tabelas
 * `labs_findings`/`labs_hypotheses`/`labs_credits_usage` continuam sendo escritas pelo
 * scientists-worker externo — não têm entity de propósito.
 */

function toDto(row: LabsExperiment, clientName?: string | null): LabsExperimentDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    clientId: row.clientId ?? null,
    clientName: clientName ?? null,
    name: row.name,
    product: row.product,
    niche: row.niche ?? null,
    market: row.market ?? null,
    country: row.country ?? null,
    language: row.language ?? null,
    objective: row.objective ?? null,
    competitors: row.competitors ?? [],
    websiteUrl: row.websiteUrl ?? null,
    selectedScientists: row.selectedScientists ?? [],
    status: row.status as LabsExperimentDto["status"],
    estimatedCredits: row.estimatedCredits,
    creditsUsed: row.creditsUsed,
    maxCredits: row.maxCredits ?? null,
    maxDurationMinutes: row.maxDurationMinutes ?? null,
    dossier: row.dossier ?? null,
    errorMessage: row.errorMessage ?? null,
    hypothesisId: row.hypothesisId ?? null,
    resultLearningId: row.resultLearningId ?? null,
    createdAt: row.createdAt.toISOString(),
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null
  };
}

async function clientNamesById(clientIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(clientIds.filter(Boolean))];
  if (!ids.length) return new Map();
  const { client: clientRepo } = await repositories();
  const clients = await clientRepo.find({ where: { id: In(ids) } });
  return new Map(clients.map((c) => [c.id, c.name]));
}

export type CreateLabsExperimentInput = {
  name: string;
  product: string;
  clientId?: string | null;
  niche?: string | null;
  market?: string | null;
  country?: string | null;
  language?: string | null;
  objective?: string | null;
  competitors?: string[];
  websiteUrl?: string | null;
  selectedScientists: string[];
  maxCredits?: number | null;
  maxDurationMinutes?: number | null;
  /** Elo Hypothesis→Experiment: experimento nascido de uma hipótese do Brain/Laboratory. */
  hypothesisId?: string | null;
};

export async function listLabsExperiments(
  tenantId: string,
  clientId?: string | null
): Promise<LabsExperimentDto[]> {
  const { labsExperiment: repo } = await repositories();
  const rows = await repo.find({
    where: clientId ? { tenantId, clientId } : { tenantId },
    order: { createdAt: "DESC" },
    take: 50
  });
  const names = await clientNamesById(rows.map((r) => r.clientId ?? ""));
  return rows.map((r) => toDto(r, r.clientId ? names.get(r.clientId) : null));
}

export async function getLabsExperiment(
  tenantId: string,
  experimentId: string
): Promise<LabsExperimentDto | null> {
  const { labsExperiment: repo } = await repositories();
  const row = await repo.findOne({ where: { id: experimentId, tenantId } });
  if (!row) return null;
  const names = await clientNamesById(row.clientId ? [row.clientId] : []);
  return toDto(row, row.clientId ? names.get(row.clientId) : null);
}

export async function createLabsExperiment(
  tenantId: string,
  userId: string,
  input: CreateLabsExperimentInput
): Promise<LabsExperimentDto> {
  const { labsExperiment: repo } = await repositories();
  const row = await repo.save(
    repo.create({
      tenantId,
      userId,
      clientId: input.clientId ?? null,
      name: input.name,
      product: input.product,
      niche: input.niche ?? null,
      market: input.market ?? null,
      country: input.country ?? null,
      language: input.language ?? null,
      objective: input.objective ?? null,
      competitors: input.competitors ?? [],
      websiteUrl: input.websiteUrl ?? null,
      selectedScientists: input.selectedScientists,
      status: "queued",
      estimatedCredits: estimateCredits(input.selectedScientists),
      maxCredits: input.maxCredits ?? null,
      maxDurationMinutes: input.maxDurationMinutes ?? null,
      hypothesisId: input.hypothesisId ?? null
    })
  );
  return toDto(row);
}

export async function listLabsAgentRuns(experimentId: string): Promise<LabsAgentRunDto[]> {
  const { labsAgentRun: repo } = await repositories();
  const rows = await repo.find({
    where: { experimentId },
    order: { startedAt: "ASC" }
  });
  return rows.map((r) => ({
    id: r.id,
    experimentId: r.experimentId,
    scientistId: r.scientistId,
    status: r.status,
    summary: r.summary ?? null,
    creditsUsed: r.creditsUsed,
    durationMs: r.durationMs ?? null,
    startedAt: r.startedAt.toISOString(),
    completedAt: r.completedAt?.toISOString() ?? null
  }));
}

export async function markLabsExperimentFailed(
  experimentId: string,
  errorMessage: string
): Promise<void> {
  const { labsExperiment: repo } = await repositories();
  await repo.update(
    { id: experimentId },
    { status: "failed", errorMessage, completedAt: new Date() }
  );
}
