import "server-only";

import { repositories } from "@/db/repositories";
import { createActionSuggestion } from "@/lib/action-suggestions/action-suggestion-service";
import { getClientCampaignMetrics } from "@/lib/agency-brain/metrics-input";
import { simulateRule } from "@/lib/automation/simulate";
import { getParameters } from "@/lib/commander/parameters";
import { emitDomainEvent } from "@/lib/events/domain-events";

/**
 * Aresta Brain→Engine (Fase 5 — a última do ecossistema, docs/orion-architecture §6.2):
 * o Brain propõe regras de automação nascidas dos dados do próprio tenant, sempre com a
 * simulação de 30 dias anexada ("teria evitado R$ X"). É o diferencial mais defensável
 * da análise competitiva (docs/orion-engine §3.1).
 *
 * Contrato de artefatos: a proposta vira uma `ClientActionSuggestion`
 * (`create_automation_rule`) no feed de sugestões existente — quem cria a regra é o
 * usuário, ao executar a sugestão. Determinístico e goal-driven (Parameters), sem custo
 * de LLM. Regra proposta nasce SEMPRE em modo aprovação.
 */

type RuleProposalPayload = {
  name: string;
  condition: {
    groups: Array<Array<{ metric: string; op: string; value: number }>>;
    minSpend?: number;
  };
  action: { type: string; budgetPercent?: number };
  executionMode: "approval";
};

type Candidate = {
  kind: string;
  title: string;
  reason: string;
  rule: RuleProposalPayload;
};

const MAX_SUGGESTIONS_PER_RUN = 2;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Candidatos determinísticos a partir das metas (Parameters) e das métricas de 7 dias. */
function buildCandidates(
  goals: { maxCpa?: number | null; minRoas?: number | null; maxSpendWithoutConversion?: number | null },
  rows: Array<{ spend: number; conversions: number; cpa: number | null; roas: number }>
): Candidate[] {
  const candidates: Candidate[] = [];

  if (goals.maxCpa != null && goals.maxCpa > 0) {
    const offenders = rows.filter(
      (r) => r.cpa != null && r.cpa > goals.maxCpa! && r.spend >= goals.maxCpa!
    );
    if (offenders.length) {
      candidates.push({
        kind: "cpa_above_goal",
        title: `Pausar campanhas com CPA acima da meta (R$ ${goals.maxCpa})`,
        reason: `${offenders.length} campanha(s) rodaram os últimos 7 dias com CPA acima da meta de R$ ${goals.maxCpa}.`,
        rule: {
          name: `CPA acima da meta (R$ ${goals.maxCpa})`,
          condition: {
            groups: [[{ metric: "cpa", op: "gt", value: goals.maxCpa }]],
            minSpend: round2(Math.max(50, goals.maxCpa))
          },
          action: { type: "pause_campaign" },
          executionMode: "approval"
        }
      });
    }
  }

  const wasteLimit = goals.maxSpendWithoutConversion ?? null;
  if (wasteLimit != null && wasteLimit > 0) {
    const offenders = rows.filter((r) => r.conversions === 0 && r.spend >= wasteLimit);
    if (offenders.length) {
      candidates.push({
        kind: "spend_no_conversion",
        title: `Pausar gasto sem conversão acima de R$ ${wasteLimit}`,
        reason: `${offenders.length} campanha(s) gastaram R$ ${wasteLimit}+ na semana sem nenhuma conversão.`,
        rule: {
          name: `Gasto sem conversão (R$ ${wasteLimit}+)`,
          condition: {
            groups: [
              [
                { metric: "conversions", op: "lt", value: 1 },
                { metric: "spend", op: "gt", value: wasteLimit }
              ]
            ]
          },
          action: { type: "pause_campaign" },
          executionMode: "approval"
        }
      });
    }
  }

  if (goals.minRoas != null && goals.minRoas > 0) {
    const winners = rows.filter((r) => r.roas >= goals.minRoas! * 1.5 && r.spend > 0);
    if (winners.length) {
      const threshold = round2(goals.minRoas * 1.5);
      candidates.push({
        kind: "roas_scale",
        title: `Escalar campanhas com ROAS acima de ${threshold}`,
        reason: `${winners.length} campanha(s) performaram 50%+ acima do ROAS mínimo (${goals.minRoas}) na semana.`,
        rule: {
          name: `Escalar ROAS > ${threshold}`,
          condition: { groups: [[{ metric: "roas", op: "gt", value: threshold }]] },
          action: { type: "scale_gradual", budgetPercent: 10 },
          executionMode: "approval"
        }
      });
    }
  }

  return candidates;
}

/** Já existe regra ativa equivalente (mesma ação + mesma métrica primária) para o cliente? */
function hasEquivalentRule(
  existing: Array<{ enabled: boolean; condition: unknown; action: unknown }>,
  candidate: Candidate
): boolean {
  const candidateMetric = candidate.rule.condition.groups[0]?.[0]?.metric;
  return existing.some((rule) => {
    if (!rule.enabled) return false;
    const action = rule.action as { type?: string } | null;
    if (action?.type !== candidate.rule.action.type) return false;
    const cond = rule.condition as {
      groups?: Array<Array<{ metric?: string }>>;
      metric?: string;
    } | null;
    const metrics = new Set(
      [...(cond?.groups?.flat().map((c) => c.metric) ?? []), cond?.metric].filter(Boolean)
    );
    return candidateMetric != null && metrics.has(candidateMetric);
  });
}

export async function suggestAutomationRulesForClient(
  tenantId: string,
  clientId: string
): Promise<number> {
  const [params, rows] = await Promise.all([
    getParameters(tenantId, { clientId }),
    getClientCampaignMetrics(tenantId, clientId, 7)
  ]);
  if (!params.goals || !rows.length) return 0;

  const candidates = buildCandidates(params.goals, rows);
  if (!candidates.length) return 0;

  const { automationRule: ruleRepo } = await repositories();
  const existingRules = await ruleRepo.find({ where: { tenantId, clientId } });

  let created = 0;
  for (const candidate of candidates) {
    if (created >= MAX_SUGGESTIONS_PER_RUN) break;
    if (hasEquivalentRule(existingRules, candidate)) continue;

    // A proposta nunca viaja sem evidência: simulação de 30 dias anexada.
    const simulation = await simulateRule(tenantId, {
      condition: candidate.rule.condition,
      action: candidate.rule.action,
      clientId,
      days: 30
    });
    if (!simulation.supported || simulation.totals.campaignsTriggered === 0) continue;

    const impact =
      simulation.totals.avoidedSpend > 0
        ? `teria evitado R$ ${round2(simulation.totals.avoidedSpend)} de gasto`
        : simulation.totals.dailyBudgetIncrease > 0
          ? `teria adicionado R$ ${round2(simulation.totals.dailyBudgetIncrease)}/dia de orçamento`
          : `teria disparado ${simulation.totals.alertDays} vez(es)`;

    const suggestion = await createActionSuggestion(tenantId, clientId, {
      title: `Regra sugerida: ${candidate.title}`,
      description:
        `${candidate.reason} Nos últimos ${simulation.days} dias, esta regra teria disparado em ` +
        `${simulation.totals.campaignsTriggered} campanha(s) e ${impact}. ` +
        `Ao executar, a regra é criada em modo de aprovação — nada roda sem o seu OK.`,
      actionType: "create_automation_rule",
      actionPayload: {
        rulePayload: candidate.rule,
        simulationSummary: {
          days: simulation.days,
          campaignsTriggered: simulation.totals.campaignsTriggered,
          alertDays: simulation.totals.alertDays,
          avoidedSpend: round2(simulation.totals.avoidedSpend),
          dailyBudgetIncrease: round2(simulation.totals.dailyBudgetIncrease)
        }
      },
      source: "RULE",
      priority: simulation.totals.avoidedSpend >= 100 ? "HIGH" : "MEDIUM",
      evidence: {
        ruleId: `brain_rule:${candidate.kind}`,
        reason: candidate.reason,
        actualValue: simulation.totals.campaignsTriggered
      },
      dedupeKey: `brain_rule:${candidate.kind}:${clientId}`
    });

    if (suggestion) {
      created++;
      await emitDomainEvent({
        tenantId,
        clientId,
        module: "brain",
        type: "brain.rule.suggested",
        sourceType: "action_suggestion",
        sourceId: suggestion.id,
        payload: {
          kind: candidate.kind,
          actionType: candidate.rule.action.type,
          avoidedSpend: round2(simulation.totals.avoidedSpend),
          campaignsTriggered: simulation.totals.campaignsTriggered
        }
      });
    }
  }

  return created;
}
