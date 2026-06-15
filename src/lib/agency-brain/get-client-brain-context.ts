import "server-only";

import { repositories } from "@/db/repositories";
import { listApprovedLearnings } from "@/lib/agency-brain/client-learning-service";
import type { ClientBrainContext, LearningDto } from "@/lib/agency-brain/types";

function buildSummaryText(learnings: LearningDto[]): string {
  if (!learnings.length) {
    return "Ainda não há aprendizados aprovados registrados para este cliente.";
  }

  const high = learnings.filter((l) => l.impact === "HIGH").slice(0, 3);
  const creative = learnings.filter((l) => l.category === "CREATIVE").slice(0, 2);
  const audience = learnings.filter((l) => l.category === "AUDIENCE").slice(0, 2);
  const negative = learnings.filter((l) => (l.tags ?? []).includes("negative")).slice(0, 1);

  const parts: string[] = [];

  if (creative.length) {
    parts.push(
      `Criativos: ${creative.map((l) => l.title.replace(/\.$/, "")).join("; ")}.`
    );
  }
  if (audience.length) {
    parts.push(
      `Públicos: ${audience.map((l) => l.title.replace(/\.$/, "")).join("; ")}.`
    );
  }
  if (high.length) {
    parts.push(
      `Alto impacto: ${high.map((l) => l.title.replace(/\.$/, "")).join("; ")}.`
    );
  }
  if (negative.length) {
    parts.push(`Evitar: ${negative[0]!.description.slice(0, 120)}.`);
  }

  return parts.length
    ? `Para este cliente, ${parts.join(" ")}`
    : learnings
        .slice(0, 5)
        .map((l) => l.title)
        .join(". ") + ".";
}

/**
 * Contexto estruturado do Agency Brain para prompts de IA.
 * Usar em /api/ai/recommendations e agentes futuros.
 */
export async function getClientBrainContext(
  tenantId: string,
  clientId: string
): Promise<ClientBrainContext> {
  const approved = await listApprovedLearnings(tenantId, clientId, 100);
  const { client: clientRepo } = await repositories();
  const client = await clientRepo.findOne({ where: { id: clientId, tenantId } });

  const creativeLearnings = approved.filter((l) => l.category === "CREATIVE");
  const audienceLearnings = approved.filter((l) => l.category === "AUDIENCE");
  const offerLearnings = approved.filter((l) => l.category === "OFFER");
  const negativeLearnings = approved.filter(
    (l) =>
      (l.tags ?? []).includes("negative") ||
      l.category === "GENERAL" ||
      l.evidence?.ruleId === "spend_no_conversion"
  );
  const highImpactLearnings = approved.filter((l) => l.impact === "HIGH");
  const recentLearnings = approved.slice(0, 10);

  const topLearnings = [...approved]
    .sort((a, b) => {
      const impactScore = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return impactScore[b.impact] - impactScore[a.impact];
    })
    .slice(0, 10);

  const tagSet = new Set<string>();
  for (const l of approved) {
    for (const t of l.tags ?? []) tagSet.add(t);
  }

  let summaryText = buildSummaryText(approved);
  if (client?.aiContext && typeof client.aiContext === "string" && client.aiContext.trim()) {
    summaryText = `${summaryText} Contexto adicional: ${client.aiContext.trim().slice(0, 300)}`;
  } else if (client?.aiContext && typeof client.aiContext === "object") {
    const ctx = JSON.stringify(client.aiContext).slice(0, 200);
    if (ctx.length > 2) summaryText = `${summaryText} Contexto adicional: ${ctx}`;
  }

  return {
    clientId,
    topLearnings,
    creativeLearnings,
    audienceLearnings,
    offerLearnings,
    negativeLearnings,
    recentLearnings,
    highImpactLearnings,
    tags: [...tagSet],
    summaryText
  };
}
