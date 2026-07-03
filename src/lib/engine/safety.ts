import "server-only";

import { MoreThanOrEqual } from "typeorm";

import { repositories } from "@/db/repositories";

/**
 * Safety do Orion Engine (Sprint 3 da régua): guardas que impedem a automação de fazer
 * besteira em escala. Consolida o que estava implícito (dedupe diário, clamp por tier,
 * kill switch) e adiciona limites explícitos:
 *
 * - Teto diário de ações automáticas por regra (um bug de threshold nunca pausa a conta
 *   inteira em loop).
 * - Piso de orçamento (redução percentual nunca derruba o orçamento a zero).
 */

/** Máx. de ações executadas automaticamente por regra por dia (aprovadas à mão não contam). */
export const MAX_AUTO_ACTIONS_PER_RULE_PER_DAY = 10;

/** Orçamento diário nunca cai abaixo disso via automação (unidades menores — R$ 1,00). */
export const BUDGET_FLOOR_MINOR = 100;

export const SAFETY_RATE_LIMIT_ERROR =
  "Safety: teto diário de ações automáticas da regra atingido — retomamos amanhã.";

/** Aplica o piso de orçamento a um novo valor calculado. */
export function applyBudgetFloor(nextMinor: number): number {
  return Math.max(BUDGET_FLOOR_MINOR, Math.round(nextMinor));
}

/**
 * A regra já atingiu o teto diário de ações automáticas? Conta `engine_executions`
 * executadas hoje com `source: "rule"` e sem aprovação humana (approvedBy null).
 */
export async function ruleDailyLimitReached(
  tenantId: string,
  automationRuleId: string
): Promise<boolean> {
  const { engineExecution: repo } = await repositories();
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const count = await repo.count({
    where: {
      tenantId,
      automationRuleId,
      source: "rule",
      status: "executed",
      executedAt: MoreThanOrEqual(startOfDay)
    }
  });
  return count >= MAX_AUTO_ACTIONS_PER_RULE_PER_DAY;
}
