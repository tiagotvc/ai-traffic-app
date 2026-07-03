import "server-only";

import { repositories } from "@/db/repositories";
import type { ClientActionSuggestion } from "@/db/entities/ClientActionSuggestion";
import { getAllTenantMetaTokens } from "@/lib/meta-auth-store";
import { fetchCampaign, pauseCampaign, updateCampaignDailyBudget } from "@/lib/meta-graph";

import type { ActionPayload } from "@/lib/action-suggestions/types";

export type MetaApplyResult = { applied: boolean; detail?: string; error?: string };

function payloadOf(row: ClientActionSuggestion): ActionPayload {
  return (row.actionPayload ?? {}) as ActionPayload;
}

export async function applySuggestionToMeta(
  tenantId: string,
  row: ClientActionSuggestion
): Promise<MetaApplyResult> {
  const payload = payloadOf(row);

  // Aresta Brain→Engine (Fase 5): executar a sugestão cria a regra no Engine — não é
  // uma ação na Meta. A regra nasce em modo aprovação (clampada pelo tier do plano,
  // mesma rede de segurança do POST /api/automation/rules) e respeita maxAutomationRules.
  if (row.actionType === "create_automation_rule") {
    if (!payload.rulePayload) {
      return { applied: false, error: "Proposta de regra sem payload" };
    }
    try {
      const { assertLimit, getEntitlements } = await import("@/lib/billing/entitlements");
      await assertLimit(tenantId, "maxAutomationRules");
      const { limits } = await getEntitlements(tenantId);
      const executionMode = limits.automationTier >= 2 ? "approval" : "auto";

      const { automationRule: ruleRepo } = await repositories();
      const rule = await ruleRepo.save(
        ruleRepo.create({
          tenantId,
          clientId: row.clientId,
          name: payload.rulePayload.name,
          enabled: true,
          condition: payload.rulePayload.condition,
          action: payload.rulePayload.action,
          executionMode
        })
      );

      const { emitDomainEvent } = await import("@/lib/events/domain-events");
      await emitDomainEvent({
        tenantId,
        clientId: row.clientId,
        module: "engine",
        type: "engine.rule.created",
        sourceType: "automation_rule",
        sourceId: rule.id,
        payload: { origin: "brain_suggestion", suggestionId: row.id, actionType: payload.rulePayload.action.type }
      });

      return {
        applied: true,
        detail: `Regra "${rule.name}" criada em modo ${executionMode === "approval" ? "aprovação" : "automático"}`
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao criar a regra";
      return { applied: false, error: msg };
    }
  }

  const tokens = await getAllTenantMetaTokens(tenantId);
  const accessToken = tokens[0];
  if (!accessToken) {
    return { applied: false, error: "Token Meta não configurado" };
  }

  const metaCampaignId = row.metaCampaignId ?? payload.metaCampaignId ?? null;
  if (!metaCampaignId && row.actionType !== "review_campaign") {
    return { applied: false, error: "Campanha Meta não vinculada à sugestão" };
  }

  try {
    switch (row.actionType) {
      case "pause_campaign": {
        if (!metaCampaignId) return { applied: false, error: "Campanha não informada" };
        await pauseCampaign(accessToken, metaCampaignId);
        return { applied: true, detail: "Campanha pausada na Meta" };
      }
      case "scale_budget": {
        if (!metaCampaignId) return { applied: false, error: "Campanha não informada" };
        const campaign = await fetchCampaign(accessToken, metaCampaignId);
        const currentMinor = Number(campaign.daily_budget ?? 0);
        if (!currentMinor) {
          return { applied: false, error: "Orçamento diário não disponível na campanha" };
        }
        const pct = payload.budgetIncreasePercent ?? 10;
        const next = Math.round(currentMinor * (1 + pct / 100));
        await updateCampaignDailyBudget(accessToken, metaCampaignId, next);
        return {
          applied: true,
          detail: `Orçamento ajustado +${pct}% (R$ ${(currentMinor / 100).toFixed(2)} → R$ ${(next / 100).toFixed(2)}/dia)`
        };
      }
      case "refresh_creative":
      case "duplicate_audience":
      case "review_campaign":
        return {
          applied: false,
          detail: "Ação registrada — conclua manualmente no Gerenciador ou use o checklist"
        };
      default:
        return { applied: false, error: "Tipo de ação não suportado para execução automática" };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro na Meta API";
    return { applied: false, error: msg };
  }
}
