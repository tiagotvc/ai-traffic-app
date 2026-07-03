import "server-only";

import type { ClientExperiment } from "@/db/entities/ClientExperiment";
import { repositories } from "@/db/repositories";
import type { ExperimentDto } from "@/lib/agency-brain/domain/schemas";

export type ExperimentFilters = {
  page?: number;
  pageSize?: number;
};

export type CreateExperimentInput = {
  title: string;
  variantA: string;
  variantB: string;
  hypothesisId?: string | null;
  metrics?: Record<string, unknown> | null;
  metaCampaignId?: string | null;
  horizonDays?: number | null;
  baselineForecast?: Record<string, unknown> | null;
  actualMetrics?: Record<string, unknown> | null;
};

export type UpdateExperimentInput = Partial<
  CreateExperimentInput & { winner: string | null; conclusion: string | null }
>;

function toExperimentDto(row: ClientExperiment): ExperimentDto {
  return {
    id: row.id,
    clientId: row.clientId,
    title: row.title,
    variantA: row.variantA,
    variantB: row.variantB,
    winner: row.winner ?? null,
    metrics: (row.metrics as ExperimentDto["metrics"]) ?? null,
    conclusion: row.conclusion ?? null,
    metaCampaignId: row.metaCampaignId ?? null,
    horizonDays: row.horizonDays ?? null,
    baselineForecast: (row.baselineForecast as ExperimentDto["baselineForecast"]) ?? null,
    actualMetrics: (row.actualMetrics as ExperimentDto["actualMetrics"]) ?? null,
    hypothesisId: row.hypothesisId ?? null,
    createdAt: row.createdAt.toISOString()
  };
}

export async function listExperiments(
  tenantId: string,
  clientId: string,
  filters: ExperimentFilters = {}
): Promise<{ items: ExperimentDto[]; total: number; page: number; pageSize: number }> {
  const { clientExperiment: repo } = await repositories();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;

  const [rows, total] = await repo.findAndCount({
    where: { tenantId, clientId },
    order: { createdAt: "DESC" },
    skip: (page - 1) * pageSize,
    take: pageSize
  });

  return { items: rows.map(toExperimentDto), total, page, pageSize };
}

export async function getExperimentById(
  tenantId: string,
  clientId: string,
  experimentId: string
): Promise<ExperimentDto | null> {
  const { clientExperiment: repo } = await repositories();
  const row = await repo.findOne({ where: { id: experimentId, tenantId, clientId } });
  return row ? toExperimentDto(row) : null;
}

export async function createExperiment(
  tenantId: string,
  clientId: string,
  input: CreateExperimentInput
): Promise<ExperimentDto> {
  const { clientExperiment: repo } = await repositories();
  const row = repo.create({
    tenantId,
    clientId,
    title: input.title,
    variantA: input.variantA,
    variantB: input.variantB,
    hypothesisId: input.hypothesisId ?? null,
    metrics: input.metrics ?? null,
    metaCampaignId: input.metaCampaignId ?? null,
    horizonDays: input.horizonDays ?? null,
    baselineForecast: input.baselineForecast ?? null,
    actualMetrics: input.actualMetrics ?? null
  });
  const saved = await repo.save(row);
  return toExperimentDto(saved);
}

export async function updateExperiment(
  tenantId: string,
  clientId: string,
  experimentId: string,
  input: UpdateExperimentInput
): Promise<ExperimentDto | null> {
  const { clientExperiment: repo } = await repositories();
  const row = await repo.findOne({ where: { id: experimentId, tenantId, clientId } });
  if (!row) return null;

  const hadOutcome = Boolean(row.winner || row.conclusion);

  if (input.title !== undefined) row.title = input.title;
  if (input.variantA !== undefined) row.variantA = input.variantA;
  if (input.variantB !== undefined) row.variantB = input.variantB;
  if (input.hypothesisId !== undefined) row.hypothesisId = input.hypothesisId;
  if (input.metrics !== undefined) row.metrics = input.metrics;
  if (input.metaCampaignId !== undefined) row.metaCampaignId = input.metaCampaignId;
  if (input.horizonDays !== undefined) row.horizonDays = input.horizonDays;
  if (input.baselineForecast !== undefined) row.baselineForecast = input.baselineForecast;
  if (input.actualMetrics !== undefined) row.actualMetrics = input.actualMetrics;
  if (input.winner !== undefined) row.winner = input.winner;
  if (input.conclusion !== undefined) row.conclusion = input.conclusion;

  const saved = await repo.save(row);

  // Fase 3 (docs/orion-architecture §2.2): quando o A/B ganha vencedor/conclusão pela
  // primeira vez, o Laboratory publica o aprendizado e o evento (best-effort).
  if (!hadOutcome && (saved.winner || saved.conclusion)) {
    try {
      const { publishAbExperimentOutcome } = await import(
        "@/lib/laboratory/experiment-outcomes"
      );
      await publishAbExperimentOutcome(tenantId, saved);
    } catch (err) {
      console.error("[experiments] publish outcome failed", err);
    }
  }

  return toExperimentDto(saved);
}

export async function deleteExperiment(
  tenantId: string,
  clientId: string,
  experimentId: string
): Promise<boolean> {
  const { clientExperiment: repo } = await repositories();
  const result = await repo.delete({ id: experimentId, tenantId, clientId });
  return (result.affected ?? 0) > 0;
}
