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
  const tokens = await getAllTenantMetaTokens(tenantId);
  const accessToken = tokens[0];
  if (!accessToken) {
    return { applied: false, error: "Token Meta não configurado" };
  }

  const payload = payloadOf(row);
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
