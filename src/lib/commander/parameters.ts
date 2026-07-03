import "server-only";

import { repositories } from "@/db/repositories";
import {
  getClientAdaptiveThresholds,
  type ClientAdaptiveThresholds
} from "@/lib/agency-brain/adaptive-thresholds";
import { getEntitlements } from "@/lib/billing/entitlements";
import type { PlanLimits } from "@/lib/billing/types";
import type { RankConfig } from "@/lib/creative-ranking";
import { entityToGoalFields, mergeGoals, type ResolvedGoals } from "@/lib/goal-types";
import { loadRankConfig } from "@/lib/ranking-config";

/**
 * Commander › Parameters (Fase 4, docs/orion-architecture §2.3): a leitura unificada
 * dos parâmetros estratégicos do tenant/cliente. As tabelas continuam onde estão
 * (ClientGoal, CampaignGoal, RankingConfig, TenantAiPolicy, PlanLimits) — este é o
 * contrato único de leitura para quem consome inteligência (chat, scientists, motor,
 * regras globais futuras).
 */

export type CommanderParameters = {
  /** Metas resolvidas (campanha sobrepõe cliente). null = cliente sem meta configurada. */
  goals: ResolvedGoals | null;
  /** Thresholds adaptativos — só quando o chamador informa o gasto semanal. */
  thresholds: ClientAdaptiveThresholds | null;
  ranking: RankConfig;
  aiPolicy: {
    distributionMode: string;
    alertThresholdPercent: number;
    reservePercent: number;
    defaultClientMonthlyCap: number | null;
  } | null;
  /** Limites operacionais do plano (tier de automação, slots de scientists, etc.). */
  operationalLimits: PlanLimits;
  planSlug: string;
};

export async function getParameters(
  tenantId: string,
  opts: {
    clientId?: string | null;
    metaCampaignId?: string | null;
    /** Gasto dos últimos 7 dias — habilita os thresholds adaptativos sem query extra. */
    weeklySpend?: number | null;
  } = {}
): Promise<CommanderParameters> {
  const repos = await repositories();

  const [clientGoalRow, campaignGoalRow, ranking, aiPolicyRow, entitlements] =
    await Promise.all([
      opts.clientId
        ? repos.clientGoal.findOne({ where: { clientId: opts.clientId } })
        : Promise.resolve(null),
      opts.clientId && opts.metaCampaignId
        ? repos.campaignGoal.findOne({
            where: { clientId: opts.clientId, metaCampaignId: opts.metaCampaignId }
          })
        : Promise.resolve(null),
      loadRankConfig(tenantId),
      repos.tenantAiPolicy.findOne({ where: { tenantId } }),
      getEntitlements(tenantId)
    ]);

  const goals = clientGoalRow
    ? mergeGoals(
        { ...entityToGoalFields(clientGoalRow), objective: clientGoalRow.objective ?? undefined },
        campaignGoalRow ? entityToGoalFields(campaignGoalRow) : null
      )
    : null;

  const thresholds =
    opts.clientId && opts.weeklySpend != null
      ? getClientAdaptiveThresholds(opts.clientId, clientGoalRow, opts.weeklySpend)
      : null;

  return {
    goals,
    thresholds,
    ranking,
    aiPolicy: aiPolicyRow
      ? {
          distributionMode: aiPolicyRow.distributionMode,
          alertThresholdPercent: aiPolicyRow.alertThresholdPercent,
          reservePercent: aiPolicyRow.reservePercent,
          defaultClientMonthlyCap: aiPolicyRow.defaultClientMonthlyCap ?? null
        }
      : null,
    operationalLimits: entitlements.limits,
    planSlug: entitlements.planSlug
  };
}
