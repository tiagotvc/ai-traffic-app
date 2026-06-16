import "server-only";

import { createHash } from "crypto";

import { getClientBrainContext } from "@/lib/agency-brain/get-client-brain-context";
import {
  getCampaignBaselinesMap,
  getClientCampaignMetricsWithComparison
} from "@/lib/agency-brain/metrics-input";
import { validateAiActionDraft } from "@/lib/agency-brain/ai-output-validator";
import { createActionSuggestion } from "@/lib/action-suggestions/action-suggestion-service";
import type { ActionSuggestionDto, SuggestedActionDraft } from "@/lib/action-suggestions/types";
import type { ActionSuggestionPriority } from "@/lib/action-suggestions/types";
import { buildFewShotBlock } from "@/lib/creative-memory/few-shot";
import {
  AiActionsResponseSchema,
  type AiActionsResponse
} from "@/lib/creative-memory/gemini-schemas";
import { getGeminiApiKey } from "@/lib/creative-memory/ai-usage";
import type { AiRunResult } from "@/lib/creative-memory/ai-analysis-types";
import { classifyGeminiError, geminiGenerateJson, type GeminiGenerateMeta } from "@/lib/gemini";

const WINDOW_DAYS = 7;

function campaignManualUrl(clientSlug: string, metaCampaignId: string): string {
  return `/clients/${clientSlug}/campaigns?campaign=${encodeURIComponent(metaCampaignId)}`;
}

function buildActionDedupeKey(actionType: string, clientId: string, scope: string): string {
  const hash = createHash("sha1").update(`${actionType}:${scope}`).digest("hex").slice(0, 10);
  return `ai:action:${actionType}:${clientId}:${scope}:${hash}:${WINDOW_DAYS}`;
}

function inferPriority(item: AiActionsResponse["suggestions"][number]): ActionSuggestionPriority {
  if (item.actionType === "pause_campaign") return "HIGH";
  if (item.actionType === "scale_budget") return "HIGH";
  if (item.budgetIncreasePercent != null && item.budgetIncreasePercent >= 20) return "HIGH";
  return "MEDIUM";
}

function toActionDraft(
  item: AiActionsResponse["suggestions"][number],
  clientId: string,
  clientSlug: string,
  campaignIds: Set<string>,
  brainSnippet?: string,
  linkedLearningIds: string[] = []
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
    linkedLearningId: linkedLearningIds[0] ?? null,
    linkedLearningIds,
    priority: inferPriority(item),
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
  pendingSuggestionTitles: string[];
  campaigns: Array<{ metaCampaignId: string; campaignName: string; metrics: Record<string, unknown> }>;
  previousCampaigns?: Array<{ metaCampaignId: string; campaignName: string; metrics: Record<string, unknown> }>;
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
    "Sugestões pendentes (não repetir):",
    args.pendingSuggestionTitles.length
      ? args.pendingSuggestionTitles.map((t) => `- ${t}`).join("\n")
      : "- (nenhuma)",
    "",
    "Campanhas (últimos 7 dias):",
    JSON.stringify(args.campaigns, null, 2),
    "",
    "Período anterior:",
    args.previousCampaigns?.length
      ? JSON.stringify(args.previousCampaigns, null, 2)
      : "- (sem histórico)",
    "",
    "Regras:",
    "- Máximo 5 sugestões acionáveis.",
    "- actionType deve ser um dos valores permitidos.",
    "- Inclua checklist curta quando fizer sentido.",
    "- Use metaCampaignId apenas se existir na lista.",
    "- Não invente números que contradigam as métricas.",
    "- Priorize ações com impacto claro e baixo risco operacional."
  ].join("\n");
}

export async function runAiActionSuggestionsForClient(
  tenantId: string,
  clientId: string,
  clientSlug: string,
  clientName: string,
  modelChain: string[]
): Promise<AiRunResult<ActionSuggestionDto> & { suggestions: ActionSuggestionDto[] }> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return {
      created: 0,
      items: [],
      suggestions: [],
      rejected: 0,
      deduped: 0,
      warnings: [],
      skippedReason: "no_api_key"
    };
  }

  const { current, previous } = await getClientCampaignMetricsWithComparison(
    tenantId,
    clientId,
    WINDOW_DAYS
  );

  if (!current.length) {
    return {
      created: 0,
      items: [],
      suggestions: [],
      rejected: 0,
      deduped: 0,
      warnings: [],
      skippedReason: "no_metrics"
    };
  }

  const baselineByCampaign = await getCampaignBaselinesMap(tenantId, clientId, 30);
  const brain = await getClientBrainContext(tenantId, clientId);
  const campaignIds = new Set(current.map((r) => r.metaCampaignId));

  const { clientActionSuggestion: sugRepo } = await (await import("@/db/repositories")).repositories();
  const pending = await sugRepo.find({
    where: { tenantId, clientId, status: "PENDING" },
    take: 10
  });

  const mapCampaign = (r: (typeof current)[number]) => ({
    metaCampaignId: r.metaCampaignId,
    campaignName: r.campaignName,
    metrics: {
      spend: r.spend,
      conversions: r.conversions,
      ctr: r.ctr,
      cpa: r.cpa,
      roas: r.roas,
      frequency: r.frequency,
      cpaDeltaPct: r.cpaDeltaPct,
      ctrDeltaPct: r.ctrDeltaPct
    }
  });

  const prompt = buildPrompt({
    clientName,
    brainSummary: brain.summaryText,
    fewShotBlock: buildFewShotBlock(brain.topLearnings),
    pendingSuggestionTitles: pending.map((p) => p.title),
    campaigns: current.slice(0, 12).map(mapCampaign),
    previousCampaigns: previous.slice(0, 12).map(mapCampaign)
  });

  let ai: AiActionsResponse;
  let modelMeta: GeminiGenerateMeta | undefined;
  try {
    const result = await geminiGenerateJson({
      apiKey,
      prompt,
      schema: AiActionsResponseSchema,
      modelChain
    });
    ai = result.data;
    modelMeta = result;
  } catch (err) {
    const classified = classifyGeminiError(err);
    return {
      created: 0,
      items: [],
      suggestions: [],
      rejected: 0,
      deduped: 0,
      warnings: [classified.message],
      error: classified
    };
  }

  if (!ai.suggestions.length) {
    return {
      created: 0,
      items: [],
      suggestions: [],
      rejected: 0,
      deduped: 0,
      warnings: ["A IA não retornou sugestões de ação para este período."],
      noResultsReason: "empty_ai",
      modelMeta
    };
  }

  const suggestions: ActionSuggestionDto[] = [];
  let rejected = 0;
  let deduped = 0;
  const warnings: string[] = [];

  for (const item of ai.suggestions) {
    const draft = toActionDraft(
      item,
      clientId,
      clientSlug,
      campaignIds,
      brain.summaryText,
      brain.topLearnings.slice(0, 2).map((l) => l.id)
    );
    const validated = validateAiActionDraft(
      {
        title: draft.title,
        description: draft.description,
        category: "GENERAL",
        metaCampaignId: draft.metaCampaignId,
        actionType: draft.actionType
      },
      current,
      baselineByCampaign
    );
    if (!validated.ok) {
      rejected += 1;
      warnings.push(validated.reason);
      continue;
    }

    const created = await createActionSuggestion(tenantId, clientId, draft);
    if (!created) {
      deduped += 1;
      continue;
    }
    suggestions.push(created);
  }

  return {
    created: suggestions.length,
    items: suggestions,
    suggestions,
    rejected,
    deduped,
    warnings,
    noResultsReason: suggestions.length === 0 ? "validation" : undefined,
    modelMeta
  };
}
