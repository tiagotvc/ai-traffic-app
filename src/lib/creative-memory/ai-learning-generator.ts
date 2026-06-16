import "server-only";

import { createHash } from "crypto";

import { getClientBrainContext } from "@/lib/agency-brain/get-client-brain-context";
import { createSuggestedLearning } from "@/lib/agency-brain/client-learning-service";
import {
  getCampaignBaselinesMap,
  getClientCampaignMetricsWithComparison
} from "@/lib/agency-brain/metrics-input";
import { validateAiLearningDraft } from "@/lib/agency-brain/ai-output-validator";
import type { LearningDto, SuggestedLearningDraft } from "@/lib/agency-brain/types";
import { buildFewShotBlock } from "@/lib/creative-memory/few-shot";
import {
  AiLearningsResponseSchema,
  type AiLearningsResponse
} from "@/lib/creative-memory/gemini-schemas";
import { getGeminiApiKey } from "@/lib/creative-memory/ai-usage";
import type { AiRunResult } from "@/lib/creative-memory/ai-analysis-types";
import { classifyGeminiError, geminiGenerateJson, type GeminiGenerateMeta } from "@/lib/gemini";

const WINDOW_DAYS = 7;

function buildLearningDedupeKey(clientId: string, title: string, category: string): string {
  const hash = createHash("sha1").update(`${title}:${category}`).digest("hex").slice(0, 10);
  return `ai:learning:${clientId}:${category}:${hash}:${WINDOW_DAYS}`;
}

function toLearningDraft(
  item: AiLearningsResponse["learnings"][number],
  clientId: string,
  campaignIds: Set<string>
): SuggestedLearningDraft {
  const metaCampaignId =
    item.metaCampaignId && campaignIds.has(item.metaCampaignId) ? item.metaCampaignId : null;

  return {
    title: item.title.trim(),
    description: item.description.trim(),
    category: item.category,
    impact: item.impact,
    confidence: item.confidence,
    metaCampaignId,
    tags: [...(item.tags ?? []), "ai"],
    evidence: {
      ruleId: "ai_creative_memory",
      reason: item.reason ?? "Análise de IA com base em métricas e memória aprovada",
      metaCampaignId: metaCampaignId ?? undefined,
      campaignName: item.campaignName
    },
    dedupeKey: buildLearningDedupeKey(clientId, item.title, item.category)
  };
}

function buildPrompt(args: {
  clientName: string;
  brainSummary: string;
  approvedTitles: string[];
  fewShotBlock: string;
  campaigns: Array<{ metaCampaignId: string; campaignName: string; metrics: Record<string, unknown> }>;
  previousCampaigns?: Array<{ metaCampaignId: string; campaignName: string; metrics: Record<string, unknown> }>;
}): string {
  return [
    "Você é um estrategista de performance marketing em uma agência.",
    "Analise métricas recentes e a memória operacional do cliente.",
    "Proponha APENAS insights novos que ainda NÃO estejam na memória aprovada.",
    "Foque em padrões acionáveis: criativos, públicos, ofertas, copy e decisões.",
    "",
    "Retorne ESTRITAMENTE JSON válido (sem markdown) no formato:",
    '{ "learnings": [ { "title": "...", "description": "...", "category": "CREATIVE|AUDIENCE|OFFER|COPY|GENERAL", "impact": "HIGH|MEDIUM|LOW", "confidence": "HIGH|MEDIUM|LOW", "tags": ["tag"], "metaCampaignId": "id ou null", "campaignName": "...", "reason": "..." } ] }',
    "",
    `Cliente: ${args.clientName}`,
    "",
    "Memória aprovada (não repetir):",
    args.approvedTitles.length
      ? args.approvedTitles.map((t) => `- ${t}`).join("\n")
      : "- (nenhum aprendizado aprovado ainda)",
    args.fewShotBlock,
    "",
    "Resumo da memória:",
    args.brainSummary,
    "",
    "Campanhas (últimos 7 dias):",
    JSON.stringify(args.campaigns, null, 2),
    "",
    "Período anterior (7 dias antes, top campanhas):",
    args.previousCampaigns?.length
      ? JSON.stringify(args.previousCampaigns, null, 2)
      : "- (sem histórico comparável)",
    "",
    "Regras:",
    "- Máximo 5 learnings.",
    "- Seja específico; cite campanha quando relevante.",
    "- Use metaCampaignId apenas se existir na lista de campanhas.",
    "- Não invente números que contradigam as métricas.",
    "- O confidenceScore será recalculado pelo sistema; foque em evidência numérica.",
    "- Preferir insights de alto impacto e confiança média/alta."
  ].join("\n");
}

export async function runAiLearningSuggestionsForClient(
  tenantId: string,
  clientId: string,
  clientName: string,
  modelChain: string[]
): Promise<AiRunResult<LearningDto> & { suggestions: LearningDto[] }> {
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
      impressions: r.impressions,
      cpaDeltaPct: r.cpaDeltaPct,
      ctrDeltaPct: r.ctrDeltaPct,
      roasDeltaPct: r.roasDeltaPct
    }
  });

  const prompt = buildPrompt({
    clientName,
    brainSummary: brain.summaryText,
    approvedTitles: brain.topLearnings.map((l) => l.title),
    fewShotBlock: buildFewShotBlock(brain.topLearnings),
    campaigns: current.slice(0, 12).map(mapCampaign),
    previousCampaigns: previous.slice(0, 12).map(mapCampaign)
  });

  let ai: AiLearningsResponse;
  let modelMeta: GeminiGenerateMeta | undefined;
  try {
    const result = await geminiGenerateJson({
      apiKey,
      prompt,
      schema: AiLearningsResponseSchema,
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

  if (!ai.learnings.length) {
    return {
      created: 0,
      items: [],
      suggestions: [],
      rejected: 0,
      deduped: 0,
      warnings: ["A IA não retornou aprendizados para este período."],
      noResultsReason: "empty_ai",
      modelMeta
    };
  }

  const suggestions: LearningDto[] = [];
  let rejected = 0;
  let deduped = 0;
  const warnings: string[] = [];

  for (const item of ai.learnings) {
    const draft = toLearningDraft(item, clientId, campaignIds);
    const validated = validateAiLearningDraft(draft, current, baselineByCampaign);
    if (!validated.ok) {
      rejected += 1;
      warnings.push(validated.reason);
      continue;
    }

    const finalDraft: SuggestedLearningDraft = {
      ...draft,
      confidence: validated.draft.confidence ?? draft.confidence,
      confidenceScore: validated.draft.confidenceScore
    };
    const created = await createSuggestedLearning(tenantId, clientId, finalDraft, "AI");
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
