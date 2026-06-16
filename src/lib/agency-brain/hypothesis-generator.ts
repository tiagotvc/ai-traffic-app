import "server-only";

import { createHash } from "crypto";

import { getClientBrainContext } from "@/lib/agency-brain/get-client-brain-context";
import { createHypothesisFromDraft } from "@/lib/agency-brain/hypothesis-service";
import { getClientCampaignMetricsWithComparison } from "@/lib/agency-brain/metrics-input";
import type { HypothesisDto } from "@/lib/agency-brain/domain/schemas";
import type { SuggestedHypothesisDraft } from "@/lib/agency-brain/hypothesis-rules";
import { buildFewShotBlock } from "@/lib/creative-memory/few-shot";
import { getGeminiApiKey } from "@/lib/creative-memory/ai-usage";
import { geminiGenerateJson, type GeminiGenerateMeta } from "@/lib/gemini";
import { z } from "zod";

const WINDOW_DAYS = 7;

const learningCategory = z.enum([
  "CREATIVE",
  "AUDIENCE",
  "OFFER",
  "COPY",
  "BUDGET",
  "LANDING_PAGE",
  "SEASONALITY",
  "GENERAL"
]);

export const AiHypothesesResponseSchema = z.object({
  hypotheses: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().min(1).max(800),
        category: learningCategory,
        confidenceScore: z.number().min(20).max(55).optional(),
        tags: z.array(z.string().min(1).max(40)).max(8).optional(),
        metaCampaignId: z.string().nullable().optional(),
        campaignName: z.string().max(200).optional(),
        reason: z.string().max(400).optional()
      })
    )
    .max(5)
});

export type AiHypothesesResponse = z.infer<typeof AiHypothesesResponseSchema>;

function buildHypothesisDedupeKey(clientId: string, title: string, category: string): string {
  const hash = createHash("sha1").update(`${title}:${category}`).digest("hex").slice(0, 10);
  return `ai:hypothesis:${clientId}:${category}:${hash}:${WINDOW_DAYS}`;
}

function toHypothesisDraft(
  item: AiHypothesesResponse["hypotheses"][number],
  clientId: string,
  campaignIds: Set<string>
): SuggestedHypothesisDraft {
  const metaCampaignId =
    item.metaCampaignId && campaignIds.has(item.metaCampaignId) ? item.metaCampaignId : null;

  return {
    title: item.title.trim().startsWith("Hipótese:")
      ? item.title.trim()
      : `Hipótese: ${item.title.trim()}`,
    description: item.description.trim(),
    category: item.category,
    confidenceScore: item.confidenceScore ?? 35,
    metaCampaignId,
    evidence: {
      ruleId: "ai_agency_brain",
      reason: item.reason ?? "Hipótese gerada por IA com base em métricas e memória",
      metaCampaignId: metaCampaignId ?? undefined,
      campaignName: item.campaignName,
      tags: item.tags
    },
    dedupeKey: buildHypothesisDedupeKey(clientId, item.title, item.category),
    tags: [...(item.tags ?? []), "ai", "hypothesis"]
  };
}

function buildPrompt(args: {
  clientName: string;
  brainSummary: string;
  dnaSummary: string;
  existingTitles: string[];
  fewShotBlock: string;
  campaigns: Array<{ metaCampaignId: string; campaignName: string; metrics: Record<string, unknown> }>;
}): string {
  return [
    "Você é um estrategista de performance marketing em uma agência.",
    "Proponha HIPÓTESES (padrões ainda não confirmados) com base em métricas recentes e memória do cliente.",
    "Hipóteses são mais fracas que aprendizados — exigem validação antes de virar memória.",
    "",
    "Retorne ESTRITAMENTE JSON válido (sem markdown) no formato:",
    '{ "hypotheses": [ { "title": "...", "description": "...", "category": "CREATIVE|AUDIENCE|OFFER|COPY|GENERAL", "confidenceScore": 35, "tags": ["tag"], "metaCampaignId": "id ou null", "campaignName": "...", "reason": "..." } ] }',
    "",
    `Cliente: ${args.clientName}`,
    "",
    "Hipóteses existentes (não repetir):",
    args.existingTitles.length
      ? args.existingTitles.map((t) => `- ${t}`).join("\n")
      : "- (nenhuma hipótese ativa)",
    args.fewShotBlock,
    "",
    "Resumo da memória:",
    args.brainSummary,
    "",
    "DNA do cliente:",
    args.dnaSummary || "(ainda não derivado)",
    "",
    "Campanhas (últimos 7 dias):",
    JSON.stringify(args.campaigns, null, 2),
    "",
    "Regras:",
    "- Máximo 5 hipóteses.",
    "- confidenceScore entre 20 e 55 (sinais fracos).",
    "- Seja específico; cite campanha quando relevante.",
    "- Prefira padrões exploratórios, não conclusões definitivas."
  ].join("\n");
}

export async function runAiHypothesisSuggestionsForClient(
  tenantId: string,
  clientId: string,
  clientName: string,
  modelChain: string[],
  existingTitles: string[] = []
): Promise<{
  created: number;
  hypotheses: HypothesisDto[];
  skippedReason?: string;
  modelMeta?: GeminiGenerateMeta;
}> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return { created: 0, hypotheses: [], skippedReason: "no_api_key" };
  }

  const { current } = await getClientCampaignMetricsWithComparison(
    tenantId,
    clientId,
    WINDOW_DAYS
  );

  if (!current.length) {
    return { created: 0, hypotheses: [], skippedReason: "no_metrics" };
  }

  const brain = await getClientBrainContext(tenantId, clientId);
  const campaignIds = new Set(current.map((r) => r.metaCampaignId));

  const prompt = buildPrompt({
    clientName,
    brainSummary: brain.summaryText,
    dnaSummary: brain.dna?.summaryText ?? "",
    existingTitles,
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
        frequency: r.frequency,
        impressions: r.impressions
      }
    }))
  });

  const { data: ai, ...modelMeta } = await geminiGenerateJson({
    apiKey,
    prompt,
    schema: AiHypothesesResponseSchema,
    modelChain
  });

  const hypotheses: HypothesisDto[] = [];
  for (const item of ai.hypotheses) {
    const draft = toHypothesisDraft(item, clientId, campaignIds);
    const created = await createHypothesisFromDraft(tenantId, clientId, draft, "AI");
    if (created) hypotheses.push(created);
  }

  return { created: hypotheses.length, hypotheses, modelMeta };
}
