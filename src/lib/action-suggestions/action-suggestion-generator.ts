import "server-only";

import { getClientBrainContext } from "@/lib/agency-brain/get-client-brain-context";
import { getClientCampaignMetricsWithComparison } from "@/lib/agency-brain/metrics-input";
import {
  avgCpa,
  avgCtr,
  pctDelta
} from "@/lib/agency-brain/learning-rules";
import type { CampaignMetricsRow } from "@/lib/agency-brain/types";
import { createActionSuggestion } from "@/lib/action-suggestions/action-suggestion-service";
import type { ActionSuggestionDto, SuggestedActionDraft } from "@/lib/action-suggestions/types";
import type { ActionSuggestionPriority } from "@/lib/action-suggestions/types";

const WINDOW_DAYS = 7;

function priorityFromDelta(delta: number): ActionSuggestionPriority {
  const abs = Math.abs(delta);
  if (abs >= 30) return "HIGH";
  if (abs >= 15) return "MEDIUM";
  return "LOW";
}

function buildActionDedupeKey(
  actionType: string,
  clientId: string,
  scope: string,
  windowDays: number
): string {
  return `action:${actionType}:${clientId}:${scope}:${windowDays}`;
}

function campaignManualUrl(clientSlug: string, metaCampaignId: string): string {
  return `/clients/${clientSlug}/campaigns?campaign=${encodeURIComponent(metaCampaignId)}`;
}

function draftScaleBudget(
  row: CampaignMetricsRow,
  clientId: string,
  clientSlug: string,
  delta: number,
  linkedLearningId?: string
): SuggestedActionDraft {
  const increase = Math.min(30, Math.max(10, Math.round(Math.abs(delta) / 2)));
  return {
    title: `Escalar budget de "${row.campaignName}"`,
    description: `CPA ${Math.abs(delta).toFixed(0)}% abaixo da média. Sugestão: aumentar budget em ~${increase}%.`,
    actionType: "scale_budget",
    actionPayload: {
      metaCampaignId: row.metaCampaignId,
      campaignName: row.campaignName,
      budgetIncreasePercent: increase,
      manualUrl: campaignManualUrl(clientSlug, row.metaCampaignId),
      checklist: [
        "Revisar frequência e saturação",
        "Confirmar capacidade de conversão",
        `Aumentar budget em ~${increase}%`
      ]
    },
    source: "RULE",
    metaCampaignId: row.metaCampaignId,
    linkedLearningId,
    linkedLearningIds: linkedLearningId ? [linkedLearningId] : [],
    priority: priorityFromDelta(delta),
    evidence: {
      ruleId: "action_scale_budget",
      reason: "CPA significantly below client average",
      deltaPercent: delta,
      actualValue: row.cpa ?? undefined,
      campaignName: row.campaignName
    },
    dedupeKey: buildActionDedupeKey("scale_budget", clientId, row.metaCampaignId, WINDOW_DAYS)
  };
}

function draftPauseCampaign(
  row: CampaignMetricsRow,
  clientId: string,
  clientSlug: string,
  reason: string,
  ruleId: string,
  spendThreshold: number
): SuggestedActionDraft {
  return {
    title: `Pausar ou revisar "${row.campaignName}"`,
    description: reason,
    actionType: "pause_campaign",
    actionPayload: {
      metaCampaignId: row.metaCampaignId,
      campaignName: row.campaignName,
      manualUrl: campaignManualUrl(clientSlug, row.metaCampaignId),
      checklist: ["Pausar campanha no Meta", "Revisar criativo e público", "Documentar aprendizado"]
    },
    source: "RULE",
    metaCampaignId: row.metaCampaignId,
    linkedLearningIds: [],
    priority: row.spend >= spendThreshold * 2 ? "HIGH" : "MEDIUM",
    evidence: {
      ruleId,
      reason,
      campaignName: row.campaignName,
      actualValue: row.spend
    },
    dedupeKey: buildActionDedupeKey("pause_campaign", clientId, row.metaCampaignId, WINDOW_DAYS)
  };
}

function draftRefreshCreative(
  row: CampaignMetricsRow,
  clientId: string,
  clientSlug: string
): SuggestedActionDraft {
  return {
    title: `Renovar criativos de "${row.campaignName}"`,
    description: `Frequência ${row.frequency.toFixed(1)} com CTR ${row.ctr.toFixed(2)}%. Considere novos criativos.`,
    actionType: "refresh_creative",
    actionPayload: {
      metaCampaignId: row.metaCampaignId,
      campaignName: row.campaignName,
      manualUrl: campaignManualUrl(clientSlug, row.metaCampaignId),
      checklist: ["Testar 2–3 variações de criativo", "Manter público estável", "Monitorar CTR por 3 dias"]
    },
    source: "RULE",
    metaCampaignId: row.metaCampaignId,
    linkedLearningIds: [],
    priority: "MEDIUM",
    evidence: {
      ruleId: "action_refresh_creative",
      reason: "High frequency with low CTR",
      actualValue: row.frequency,
      campaignName: row.campaignName
    },
    dedupeKey: buildActionDedupeKey("refresh_creative", clientId, row.metaCampaignId, WINDOW_DAYS)
  };
}

function draftLandingPageReview(
  row: CampaignMetricsRow,
  clientId: string,
  clientSlug: string,
  baselineCtr: number
): SuggestedActionDraft {
  return {
    title: `Revisar landing page de "${row.campaignName}"`,
    description: `CTR ${row.ctr.toFixed(2)}% (${pctDelta(row.ctr, baselineCtr).toFixed(0)}% acima da média) mas CPA elevado — possível problema na página de destino.`,
    actionType: "review_campaign",
    actionPayload: {
      metaCampaignId: row.metaCampaignId,
      campaignName: row.campaignName,
      manualUrl: campaignManualUrl(clientSlug, row.metaCampaignId),
      checklist: ["Conferir velocidade da LP", "Alinhar promessa do anúncio com a página", "Testar CTA"]
    },
    source: "RULE",
    metaCampaignId: row.metaCampaignId,
    linkedLearningIds: [],
    priority: priorityFromDelta(pctDelta(row.ctr, baselineCtr)),
    evidence: {
      ruleId: "action_landing_page",
      reason: "High CTR with poor conversion efficiency",
      deltaPercent: pctDelta(row.ctr, baselineCtr),
      campaignName: row.campaignName
    },
    dedupeKey: buildActionDedupeKey("review_campaign", clientId, row.metaCampaignId, WINDOW_DAYS)
  };
}

function evaluateActionDrafts(
  current: CampaignMetricsRow[],
  clientId: string,
  clientSlug: string,
  spendThreshold: number
): SuggestedActionDraft[] {
  const drafts: SuggestedActionDraft[] = [];
  const baselineCpa = avgCpa(current);
  const baselineCtr = avgCtr(current);
  const usedCampaigns = new Set<string>();

  if (baselineCpa) {
    for (const row of current) {
      if (!row.cpa || row.conversions < 2) continue;
      const delta = pctDelta(row.cpa, baselineCpa);
      if (delta <= -25 && !usedCampaigns.has(row.metaCampaignId)) {
        usedCampaigns.add(row.metaCampaignId);
        drafts.push(draftScaleBudget(row, clientId, clientSlug, delta));
      }
    }
  }

  for (const row of current) {
    if (row.spend >= spendThreshold && row.conversions === 0) {
      drafts.push(
        draftPauseCampaign(
          row,
          clientId,
          clientSlug,
          `R$ ${row.spend.toFixed(0)} gastos sem conversões.`,
          "action_spend_no_conversion",
          spendThreshold
        )
      );
    }
  }

  for (const row of current) {
    if (row.frequency > 3.5 && row.ctr < 1 && row.impressions > 1000) {
      drafts.push(draftRefreshCreative(row, clientId, clientSlug));
    }
  }

  if (baselineCpa && baselineCtr) {
    for (const row of current) {
      if (row.impressions < 500 || !row.cpa) continue;
      const ctrDelta = pctDelta(row.ctr, baselineCtr);
      const cpaDelta = pctDelta(row.cpa, baselineCpa);
      if (ctrDelta >= 30 && cpaDelta >= 15) {
        drafts.push(draftLandingPageReview(row, clientId, clientSlug, baselineCtr));
      }
    }
  }

  return drafts;
}

/**
 * Generates actionable suggestions using campaign metrics + approved brain context.
 */
export async function runActionSuggestionsForClient(
  tenantId: string,
  clientId: string,
  clientSlug: string
): Promise<{ created: number; suggestions: ActionSuggestionDto[] }> {
  const { repositories: repos } = await import("@/db/repositories");
  const { clientGoal: goalRepo } = await repos();
  const goal = await goalRepo.findOne({ where: { clientId } });
  const spendThreshold =
    goal?.maxSpendWithoutConversion != null
      ? Number(goal.maxSpendWithoutConversion)
      : 500;

  const { current } = await getClientCampaignMetricsWithComparison(
    tenantId,
    clientId,
    WINDOW_DAYS
  );

  if (!current.length) {
    return { created: 0, suggestions: [] };
  }

  const brainContext = await getClientBrainContext(tenantId, clientId);
  const drafts = evaluateActionDrafts(current, clientId, clientSlug, spendThreshold);

  if (brainContext.summaryText && drafts.length === 0) {
    drafts.push({
      title: "Revisar campanhas com base na memória do cliente",
      description: brainContext.summaryText.slice(0, 400),
      actionType: "review_campaign",
      actionPayload: {
        manualUrl: `/clients/${clientSlug}`,
        checklist: ["Revisar aprendizados aprovados", "Priorizar campanhas mencionadas na memória"]
      },
      source: "RULE",
      linkedLearningIds: brainContext.topLearnings.slice(0, 2).map((l) => l.id),
      priority: "MEDIUM",
      evidence: {
        ruleId: "brain_context_review",
        reason: "Approved learnings suggest follow-up actions",
        brainContextSnippet: brainContext.summaryText.slice(0, 200)
      },
      dedupeKey: buildActionDedupeKey("brain_review", clientId, "global", WINDOW_DAYS)
    });
  } else if (brainContext.summaryText) {
    for (const draft of drafts) {
      draft.evidence.brainContextSnippet = brainContext.summaryText.slice(0, 120);
    }
  }

  const suggestions: ActionSuggestionDto[] = [];
  for (const draft of drafts) {
    const created = await createActionSuggestion(tenantId, clientId, draft);
    if (created) suggestions.push(created);
  }

  return { created: suggestions.length, suggestions };
}
