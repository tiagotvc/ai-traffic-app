import "server-only";

import { createHash } from "crypto";

import { getClientBrainContext } from "@/lib/agency-brain/get-client-brain-context";
import { getClientCampaignMetricsWithComparison } from "@/lib/agency-brain/metrics-input";
import { createActionSuggestion } from "@/lib/action-suggestions/action-suggestion-service";
import type { ActionSuggestionDto, SuggestedActionDraft } from "@/lib/action-suggestions/types";
import { buildFewShotBlock } from "@/lib/creative-memory/few-shot";
import {
  AiActionsResponseSchema,
  type AiActionsResponse
} from "@/lib/creative-memory/gemini-schemas";
import { getGeminiApiKey } from "@/lib/creative-memory/ai-usage";
import { geminiGenerateJson, type GeminiGenerateMeta } from "@/lib/gemini";

const WINDOW_DAYS = 7;

function campaignManualUrl(clientSlug: string, metaCampaignId: string): string {
  return `/clients/${clientSlug}/campaigns?campaign=${encodeURIComponent(metaCampaignId)}`;
}

function buildActionDedupeKey(actionType: string, clientId: string, scope: string): string {
  const hash = createHash("sha1").update(`${actionType}:${scope}`).digest("hex").slice(0, 10);
  return `ai:action:${actionType}:${clientId}:${scope}:${hash}:${WINDOW_DAYS}`;
}

function toActionDraft(
  item: AiActionsResponse["suggestions"][number],
  clientId: string,
  clientSlug: string,
  campaignIds: Set<string>,
  brainSnippet?: string
): SuggestedActionDraft {
  const metaCampaignId =
    item.metaCampaignId && campaignIds.has(item.metaCampaignId) ? item.metaCampaignId : null;
  const scope = metaCampaignId ?? slugify(item.title);

  return {
    title: item.title.trim(),
    description: item.description.trim(),
    actionType: item.actionType,
    source: "AI",
    metaCampaignId,
    actionPayload: {
      metaCampaignId: metaCampaignId ?? undefined,
      campaignName: item.campaignName,
      budgetIncreasePercent: item.budgetIncreasePercent,
      manualUrl: metaCampaignId ? campaignManualUrl(clientSlug, metaCampaignId) : `/clients/${clientSlug}`,
      checklist: item.checklist ?? ["Revisar contexto", "Executar no Meta", "Registrar resultado na memória"]
    },
    evidence: {
      ruleId: "ai_creative_memory",
      reason: item.reason ?? "Sugestão gerada por IA com base em métricas e memória",
      campaignName: item.campaignName,
      brainContextSnippet: brainSnippet?.slice(0, 160)
    },
    dedupeKey: buildActionDedupeKey(item.actionType, clientId, scope)
  };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function buildPrompt(args: {
  clientName: string;
  brainSummary: string;
  fewShotBlock: string;
  campaigns: Array<{ metaCampaignId: string; campaignName: string; metrics: Record<string, unknown> }>;
}): string {
  return [
    "Você é um gestor de tráfego sênior.",
    "Com base nas métricas recentes e na memória operacional do cliente, sugira ações concretas.",
    "",
    "Retorne ESTRITAMENTE JSON válido (sem markdown) no formato:",
    '{ "suggestions": [ { "title": "...", "description": "...", "actionType": "scale_budget|pause_campaign|duplicate_audience|refresh_creative|review_campaign", "metaCampaignId": "id ou null", "campaignName": "...", "budgetIncreasePercent": 15, "reason": "...", "checklist": ["passo 1"] } ] }',
    "",
    `Cliente: ${args.clientName}`,
    "",
    "Memória operacional:",
    args.brainSummary,
    args.fewShotBlock,
    "",
    "Campanhas (últimos 7 dias):",
    JSON.stringify(args.campaigns, null, 2),
    "",
    "Regras:",
    "- Máximo 5 sugestões acionáveis.",
    "- actionType deve ser um dos valores permitidos.",
    "- Inclua checklist curta quando fizer sentido.",
    "- Use metaCampaignId apenas se existir na lista.",
    "- Priorize ações com impacto claro e baixo risco operacional."
  ].join("\n");
}

export async function runAiActionSuggestionsForClient(
  tenantId: string,
  clientId: string,
  clientSlug: string,
  clientName: string,
  modelChain: string[]
): Promise<{
  created: number;
  suggestions: ActionSuggestionDto[];
  skippedReason?: string;
  modelMeta?: GeminiGenerateMeta;
}> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return { created: 0, suggestions: [], skippedReason: "no_api_key" };
  }

  const { current } = await getClientCampaignMetricsWithComparison(
    tenantId,
    clientId,
    WINDOW_DAYS
  );

  if (!current.length) {
    return { created: 0, suggestions: [], skippedReason: "no_metrics" };
  }

  const brain = await getClientBrainContext(tenantId, clientId);
  const campaignIds = new Set(current.map((r) => r.metaCampaignId));

  const prompt = buildPrompt({
    clientName,
    brainSummary: brain.summaryText,
    fewShotBlock: buildFewShotBlock(brain.topLearnings),
    campaigns: current.slice(0, 12).map((r) => ({
      metaCampaignId: r.metaCampaignId,
      campaignName: r.campaignName,
      metrics: {
        spend: r.spend,
        conversions: r.conversions,
        ctr: r.ctr,
        cpa: r.cpa,
        roas: r.roas,
        frequency: r.frequency
      }
    }))
  });

  const { data: ai, ...modelMeta } = await geminiGenerateJson({
    apiKey,
    prompt,
    schema: AiActionsResponseSchema,
    modelChain
  });

  const suggestions: ActionSuggestionDto[] = [];
  for (const item of ai.suggestions) {
    const draft = toActionDraft(
      item,
      clientId,
      clientSlug,
      campaignIds,
      brain.summaryText
    );
    const created = await createActionSuggestion(tenantId, clientId, draft);
    if (created) suggestions.push(created);
  }

  return { created: suggestions.length, suggestions, modelMeta };
}
