import "server-only";

import type { ClientExperiment } from "@/db/entities/ClientExperiment";
import { repositories } from "@/db/repositories";
import { createSuggestedLearning } from "@/lib/agency-brain/client-learning-service";
import { emitDomainEvent } from "@/lib/events/domain-events";

/**
 * Fase 3 do Laboratory (docs/orion-architecture §2.2): todo experimento concluído
 * publica um aprendizado sugerido — o elo Experiment→Learning que fecha o ciclo
 * Hypothesis→Experiment→Learning. Comunicação por artefato: o Laboratory grava o
 * `ClientLearning` (SUGGESTED) e emite `laboratory.experiment.completed` no outbox;
 * quem consome decide o que fazer.
 */

type DossierShape = {
  executiveSummary?: { headline?: string; objective?: string };
  highlights?: Array<{ title?: string; text?: string }>;
  hypotheses?: Array<{ name?: string; confidence?: number }>;
};

/** Experimento de pesquisa (kind "research") concluído → learning + evento. */
export async function publishLabsExperimentOutcome(
  tenantId: string,
  experimentId: string
): Promise<void> {
  const { labsExperiment: repo } = await repositories();
  const experiment = await repo.findOne({ where: { id: experimentId, tenantId } });
  if (!experiment || experiment.status !== "completed" || experiment.resultLearningId) return;

  await emitDomainEvent({
    tenantId,
    clientId: experiment.clientId ?? null,
    module: "laboratory",
    type: "laboratory.experiment.completed",
    sourceType: "labs_experiment",
    sourceId: experiment.id,
    payload: {
      kind: "research",
      name: experiment.name,
      hypothesisId: experiment.hypothesisId ?? null,
      creditsUsed: experiment.creditsUsed,
      scientists: experiment.selectedScientists
    }
  });

  // Learning é por cliente — pesquisa sem cliente vinculado só emite o evento.
  if (!experiment.clientId) return;

  const dossier = (experiment.dossier ?? {}) as DossierShape;
  const topHypothesis = dossier.hypotheses?.[0]?.name;
  const highlight = dossier.highlights?.[0];
  const descriptionParts = [
    dossier.executiveSummary?.headline ?? `Pesquisa "${experiment.name}" concluída.`,
    topHypothesis ? `Hipótese principal: ${topHypothesis}.` : null,
    highlight?.text ? `Destaque: ${highlight.text}` : null
  ].filter(Boolean);

  const learning = await createSuggestedLearning(
    tenantId,
    experiment.clientId,
    {
      title: `Pesquisa do Laboratory: ${experiment.name}`,
      description: descriptionParts.join(" "),
      category: "GENERAL",
      impact: "MEDIUM",
      confidence: "MEDIUM",
      evidence: {
        ruleId: "labs_experiment_completed",
        reason: "Dossiê consolidado dos scientists",
        comparedTo: experiment.product
      },
      dedupeKey: `labs_experiment:${experiment.id}`,
      tags: ["laboratory", "research", ...(experiment.niche ? [experiment.niche] : [])]
    },
    "AI"
  );

  if (learning) {
    await repo.update({ id: experiment.id }, { resultLearningId: learning.id });
  }
}

/** A/B real (kind "ab_test") com vencedor/conclusão → learning + evento. */
export async function publishAbExperimentOutcome(
  tenantId: string,
  experiment: ClientExperiment
): Promise<void> {
  if (experiment.resultLearningId) return;
  if (!experiment.winner && !experiment.conclusion) return;

  await emitDomainEvent({
    tenantId,
    clientId: experiment.clientId,
    module: "laboratory",
    type: "laboratory.experiment.completed",
    sourceType: "client_experiment",
    sourceId: experiment.id,
    payload: {
      kind: "ab_test",
      title: experiment.title,
      winner: experiment.winner ?? null,
      hypothesisId: experiment.hypothesisId ?? null,
      metaCampaignId: experiment.metaCampaignId ?? null
    }
  });

  const winnerText =
    experiment.winner === "A"
      ? experiment.variantA
      : experiment.winner === "B"
        ? experiment.variantB
        : experiment.winner;

  const learning = await createSuggestedLearning(tenantId, experiment.clientId, {
    title: `Experimento A/B concluído: ${experiment.title}`,
    description: [
      winnerText ? `Vencedor: ${winnerText}.` : null,
      experiment.conclusion ?? null
    ]
      .filter(Boolean)
      .join(" "),
    category: "GENERAL",
    impact: "MEDIUM",
    confidence: experiment.winner ? "HIGH" : "MEDIUM",
    metaCampaignId: experiment.metaCampaignId ?? null,
    evidence: {
      ruleId: "ab_experiment_completed",
      reason: `A: ${experiment.variantA} × B: ${experiment.variantB}`,
      metaCampaignId: experiment.metaCampaignId ?? undefined
    },
    dedupeKey: `ab_experiment:${experiment.id}`,
    tags: ["laboratory", "ab-test"]
  });

  if (learning) {
    const { clientExperiment: repo } = await repositories();
    await repo.update({ id: experiment.id }, { resultLearningId: learning.id });
  }
}
