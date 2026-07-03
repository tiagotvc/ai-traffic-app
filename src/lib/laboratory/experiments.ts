import "server-only";

import { repositories } from "@/db/repositories";

/**
 * Leitura unificada do agregado Experiment (Fase 3, docs/orion-architecture §2.2).
 * Os dois modelos persistidos convergem num shape único com discriminador `kind` —
 * a versão sem big-bang do agregado: as tabelas ficam onde estão, o contrato unifica.
 * (`kind: "simulation"` — o Testing Scientist — é efêmero e não aparece aqui; ele
 * persiste direto em `ClientHypothesis`.)
 */

export type UnifiedExperimentKind = "research" | "ab_test";

export type UnifiedExperiment = {
  id: string;
  kind: UnifiedExperimentKind;
  title: string;
  /** Normalizado: draft | queued | running | completed | failed. */
  status: string;
  clientId: string | null;
  hypothesisId: string | null;
  resultLearningId: string | null;
  metaCampaignId: string | null;
  createdAt: string;
  completedAt: string | null;
};

const RESEARCH_RUNNING = new Set([
  "running",
  "collecting_data",
  "analyzing",
  "generating_hypotheses",
  "calculating_confidence",
  "finalizing"
]);

function normalizeResearchStatus(status: string): string {
  if (RESEARCH_RUNNING.has(status)) return "running";
  return status; // draft | queued | completed | failed
}

export async function listUnifiedExperiments(
  tenantId: string,
  clientId?: string | null
): Promise<UnifiedExperiment[]> {
  const { labsExperiment: labsRepo, clientExperiment: abRepo } = await repositories();

  const [research, abTests] = await Promise.all([
    labsRepo.find({
      where: clientId ? { tenantId, clientId } : { tenantId },
      order: { createdAt: "DESC" },
      take: 50
    }),
    abRepo.find({
      where: clientId ? { tenantId, clientId } : { tenantId },
      order: { createdAt: "DESC" },
      take: 50
    })
  ]);

  const unified: UnifiedExperiment[] = [
    ...research.map((r) => ({
      id: r.id,
      kind: "research" as const,
      title: r.name,
      status: normalizeResearchStatus(r.status),
      clientId: r.clientId ?? null,
      hypothesisId: r.hypothesisId ?? null,
      resultLearningId: r.resultLearningId ?? null,
      metaCampaignId: null,
      createdAt: r.createdAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null
    })),
    ...abTests.map((r) => ({
      id: r.id,
      kind: "ab_test" as const,
      title: r.title,
      status: r.winner || r.conclusion ? "completed" : "running",
      clientId: r.clientId,
      hypothesisId: r.hypothesisId ?? null,
      resultLearningId: r.resultLearningId ?? null,
      metaCampaignId: r.metaCampaignId ?? null,
      createdAt: r.createdAt.toISOString(),
      completedAt: r.winner || r.conclusion ? r.updatedAt.toISOString() : null
    }))
  ];

  return unified.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
