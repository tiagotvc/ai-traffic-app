import "server-only";

import { repositories } from "@/db/repositories";
import { SCIENTIST_CREDITS } from "@/lib/labs/types";

const MOCK_SUMMARIES: Record<string, string> = {
  competitor: "Panorama competitivo mapeado com padrões de anúncio e oferta.",
  consumer: "Perfil do público sintetizado a partir de sinais de demanda.",
  trend: "Momento do nicho indica tração estável com janela de oportunidade.",
  hypothesis: "Hipóteses priorizadas para testar em campanha e criativo.",
  confidence: "Achados ranqueados por relevância para ação imediata."
};

const PIPELINE_STATUS = [
  "running",
  "collecting_data",
  "analyzing",
  "generating_hypotheses",
  "calculating_confidence",
  "finalizing"
] as const;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Dev/preview: roda pipeline mock sem worker nem Inngest. */
export function isLabsMockMode(): boolean {
  if (process.env.LABS_MOCK_MODE === "0") return false;
  if (process.env.LABS_MOCK_MODE === "1") return true;
  return process.env.NODE_ENV === "development";
}

function buildMockDossier(
  product: string,
  scientists: string[],
  creditsUsed: number,
  objective?: string | null
): Record<string, unknown> {
  return {
    executiveSummary: {
      headline: `Pesquisa concluída para ${product}`,
      objective: objective || "Explorar mercado, público e oportunidades.",
      scientistsUsed: scientists,
      creditsUsed,
      dataQuality: "mock_preview",
      note: "Dados de demonstração — refine a UI antes de conectar os cientistas reais."
    },
    highlights: [
      {
        type: "opportunity",
        title: "Ângulo de oportunidade",
        text: "Posicionamento educativo com prova social tende a performar melhor que desconto direto."
      },
      {
        type: "audience",
        title: "Público",
        text: "Decisão emocional com necessidade de validação antes da compra."
      },
      {
        type: "creative",
        title: "Criativo",
        text: "UGC curto (9:16) com depoimento nos primeiros 3 segundos."
      }
    ],
    hypotheses: [
      { rank: 1, name: "Hook de dor + transformação em 90 dias", confidence: 0.72 },
      { rank: 2, name: "Oferta kit + bônus de suporte", confidence: 0.65 },
      { rank: 3, name: "Prova social em carrossel", confidence: 0.58 }
    ],
    nextSteps: [
      "Validar hook principal em tráfego frio",
      "Testar 2 variações de oferta",
      "Monitorar CPA nas primeiras 72h"
    ]
  };
}

export async function runLabsMockPipeline(
  experimentId: string,
  selectedScientists: string[]
): Promise<void> {
  const { labsExperiment: repo, labsAgentRun: runRepo } = await repositories();
  const experiment = await repo.findOne({ where: { id: experimentId } });
  if (!experiment) return;

  await repo.update({ id: experimentId }, { status: "running", startedAt: new Date() });

  let creditsUsed = 0;

  for (let i = 0; i < selectedScientists.length; i++) {
    const scientistId = selectedScientists[i]!;
    const status = PIPELINE_STATUS[Math.min(i, PIPELINE_STATUS.length - 1)];
    const credits = SCIENTIST_CREDITS[scientistId] ?? 5;
    creditsUsed += credits;

    await repo.update({ id: experimentId }, { status });

    await sleep(1200);

    await runRepo.save(
      runRepo.create({
        experimentId,
        scientistId,
        status: "completed",
        summary: MOCK_SUMMARIES[scientistId] ?? `Análise mock do cientista ${scientistId}.`,
        creditsUsed: credits,
        durationMs: 800 + i * 400,
        completedAt: new Date()
      })
    );

    await repo.update({ id: experimentId }, { creditsUsed });
  }

  const dossier = buildMockDossier(
    experiment.product,
    selectedScientists,
    creditsUsed,
    experiment.objective
  );

  experiment.status = "completed";
  experiment.dossier = dossier;
  experiment.creditsUsed = creditsUsed;
  experiment.completedAt = new Date();
  await repo.save(experiment);

  // Fase 3: conclusão publica o aprendizado e o domain event (best-effort).
  try {
    const { publishLabsExperimentOutcome } = await import("@/lib/laboratory/experiment-outcomes");
    await publishLabsExperimentOutcome(experiment.tenantId, experimentId);
  } catch (err) {
    console.error("[labs mock-runner] publish outcome failed", err);
  }
}
