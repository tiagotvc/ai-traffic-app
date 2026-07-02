import "server-only";

import { z } from "zod";

import { getClientCampaignMetrics } from "@/lib/agency-brain/metrics-input";
import { llmGenerateJson } from "@/lib/llm/generate-json";
import { getApiKeyForProvider } from "@/lib/llm/keys";
import type { LlmGenerateMeta, LlmProviderId } from "@/lib/llm/types";

/** Resumo compacto do rascunho enviado pelo client (nunca o payload inteiro). */
export type AskDraftSummary = {
  objective?: string;
  campaignName?: string;
  dailyBudgetBRL?: number;
  adsetName?: string;
  hasMedia?: boolean;
  personaSelected?: boolean;
  step?: string;
};

export type AskInsightSummary = { title: string; description: string; source: string };

const AnswerSchema = z.object({
  /** Resposta em pt-BR, direta, máx. ~3 parágrafos curtos. */
  answer: z.string().min(1).max(2000)
});

export type AskCommanderResult = LlmGenerateMeta & { answer: string };

function formatBudget(value?: number): string {
  return value && value > 0 ? `R$ ${value.toFixed(2)}/dia` : "não definido";
}

/**
 * Responde uma pergunta do usuário no contexto do criador de campanha.
 * Contexto = rascunho (resumo) + dossiê dos Scientists (se houver) + memória do Brain
 * (métricas reais dos últimos 7 dias, só quando a flag `campaigns.commander.memory` permite).
 * Provider: Claude quando há chave, senão Gemini; fallback pro outro em erro.
 */
export async function askCommander(input: {
  tenantId: string;
  clientId: string;
  clientName: string;
  question: string;
  draft: AskDraftSummary;
  insights?: AskInsightSummary[];
  memoryEnabled: boolean;
}): Promise<AskCommanderResult> {
  const lines: string[] = [
    "Você é o Orion Commander — o copiloto estratégico de tráfego pago da plataforma Orion.",
    "Responda em português do Brasil, direto e acionável, no máximo 3 parágrafos curtos.",
    "Use APENAS o contexto abaixo. Se faltar informação, diga o que falta e como obter.",
    "Nunca invente métricas ou resultados.",
    "",
    `Cliente: ${input.clientName}`,
    "",
    "== Rascunho da campanha ==",
    `Objetivo: ${input.draft.objective ?? "não definido"}`,
    `Nome: ${input.draft.campaignName ?? "não definido"}`,
    `Orçamento diário: ${formatBudget(input.draft.dailyBudgetBRL)}`,
    `Conjunto: ${input.draft.adsetName ?? "não definido"}`,
    `Criativo com mídia: ${input.draft.hasMedia ? "sim" : "não"}`,
    `Persona selecionada: ${input.draft.personaSelected ? "sim" : "não"}`,
    input.draft.step ? `Passo atual do criador: ${input.draft.step}` : ""
  ];

  if (input.insights?.length) {
    lines.push(
      "",
      "== Achados dos Scientists (pesquisa desta sessão) ==",
      ...input.insights
        .slice(0, 6)
        .map((i) => `- [${i.source}] ${i.title}: ${i.description.slice(0, 200)}`)
    );
  }

  if (input.memoryEnabled) {
    const rows = await getClientCampaignMetrics(input.tenantId, input.clientId, 7);
    const top = [...rows].sort((a, b) => b.spend - a.spend).slice(0, 5);
    lines.push(
      "",
      "== Memória (campanhas reais dos últimos 7 dias) ==",
      top.length
        ? top
            .map(
              (r) =>
                `- ${r.campaignName}: gasto R$ ${r.spend.toFixed(2)}, ${r.conversions} conv., ` +
                `CTR ${r.ctr.toFixed(2)}%, CPA ${r.cpa != null ? `R$ ${r.cpa.toFixed(2)}` : "—"}, ROAS ${r.roas.toFixed(2)}`
            )
            .join("\n")
        : "(sem métricas sincronizadas no período)"
    );
  }

  lines.push("", `== Pergunta do usuário ==`, input.question.trim());
  const prompt = lines.filter((l) => l !== "").join("\n");

  // Padrão do produto: default Claude + fallback Gemini (docs/copilot §3.3).
  const providers: LlmProviderId[] = getApiKeyForProvider("claude")
    ? ["claude", "gemini"]
    : ["gemini"];

  let lastError: unknown;
  for (const provider of providers) {
    try {
      const { data, ...meta } = await llmGenerateJson({
        provider,
        prompt,
        schema: AnswerSchema,
        temperature: 0.4
      });
      return { ...meta, answer: data.answer };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}
