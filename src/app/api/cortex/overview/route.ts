import { NextResponse } from "next/server";
import { MoreThanOrEqual } from "typeorm";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";

/**
 * Home do Orion Cortex: os números que respondem "onde estou perdendo/ganhando
 * dinheiro?" + a linha do tempo do ecossistema (domain_events → texto amigável).
 */

const EVENT_LABEL: Record<string, string> = {
  "engine.action.executed": "Cortex executou uma ação",
  "engine.action.failed": "Ação do Cortex falhou",
  "engine.action.pending": "Ação aguardando sua aprovação",
  "engine.action.approved": "Você aprovou uma ação",
  "engine.action.rejected": "Você rejeitou uma ação",
  "engine.action.safety_blocked": "Safety bloqueou uma ação (teto diário)",
  "engine.rule.created": "Regra criada a partir de recomendação",
  "brain.rule.suggested": "Cortex recomendou uma nova regra",
  "laboratory.learning.suggested": "Novo aprendizado sugerido",
  "laboratory.hypothesis.suggested": "Nova hipótese para investigar",
  "laboratory.experiment.completed": "Experimento concluído"
};

export async function GET() {
  const { tenant } = await getAppContext();

  const repos = await repositories();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [recommendations, activeRules, executions7d, suggestedLearnings, openHypotheses, events] =
    await Promise.all([
      repos.clientActionSuggestion.find({
        where: { tenantId: tenant.id, status: "PENDING", actionType: "create_automation_rule" },
        order: { createdAt: "DESC" },
        take: 100
      }),
      repos.automationRule.count({ where: { tenantId: tenant.id, enabled: true } }),
      repos.engineExecution.count({
        where: { tenantId: tenant.id, createdAt: MoreThanOrEqual(sevenDaysAgo) }
      }),
      repos.clientLearning.count({ where: { tenantId: tenant.id, status: "SUGGESTED" } }),
      repos.clientHypothesis.count({ where: { tenantId: tenant.id, status: "SUGGESTED" } }),
      repos.domainEvent.find({
        where: { tenantId: tenant.id },
        order: { createdAt: "DESC" },
        take: 15
      })
    ]);

  const potentialSavings = recommendations.reduce((sum, r) => {
    const summary = (r.actionPayload as { simulationSummary?: { avoidedSpend?: number } } | null)
      ?.simulationSummary;
    return sum + (Number(summary?.avoidedSpend) || 0);
  }, 0);

  return NextResponse.json({
    ok: true,
    observationMode: tenant.automationObservationMode,
    stats: {
      potentialSavings: Math.round(potentialSavings * 100) / 100,
      recommendations: recommendations.length,
      activeRules,
      executions7d,
      suggestedLearnings,
      openHypotheses
    },
    timeline: events.map((e) => ({
      id: e.id,
      at: e.createdAt,
      module: e.module,
      type: e.type,
      label: EVENT_LABEL[e.type] ?? e.type
    }))
  });
}
