import "server-only";

import { getClientBrainContext } from "@/lib/agency-brain/get-client-brain-context";
import { loadClientSignals, type ClientSignalsContext } from "@/lib/agency-brain/client-signals";
import { signalsToActionDrafts } from "@/lib/agency-brain/signal-mappers";
import { createActionSuggestion } from "@/lib/action-suggestions/action-suggestion-service";
import type { ActionSuggestionDto, SuggestedActionDraft } from "@/lib/action-suggestions/types";

const WINDOW_DAYS = 7;

function buildActionDedupeKey(
  actionType: string,
  clientId: string,
  scope: string,
  windowDays: number
): string {
  return `action:${actionType}:${clientId}:${scope}:${windowDays}`;
}

/**
 * Generates actionable suggestions using campaign signals + approved brain context.
 */
export async function runActionSuggestionsForClient(
  tenantId: string,
  clientId: string,
  clientSlug: string,
  preloaded?: ClientSignalsContext
): Promise<{ created: number; suggestions: ActionSuggestionDto[] }> {
  const ctx = preloaded ?? (await loadClientSignals(tenantId, clientId, WINDOW_DAYS));

  if (!ctx) {
    return { created: 0, suggestions: [] };
  }

  const brainContext = await getClientBrainContext(tenantId, clientId);
  const drafts = signalsToActionDrafts(
    ctx.signals,
    clientId,
    clientSlug,
    ctx.windowDays,
    ctx.totalSpend
  );

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
