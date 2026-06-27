import "server-only";

import { z } from "zod";

import type { Client } from "@/db/entities/Client";
import { slugify } from "@/lib/app-context";
import { getClientBrainContext } from "@/lib/agency-brain/get-client-brain-context";
import { loadClientSignals } from "@/lib/agency-brain/client-signals";
import { signalsToActionDrafts } from "@/lib/agency-brain/signal-mappers";
import { aiGenerateJson } from "@/lib/ai/generate";
import type { ActionSuggestionType } from "@/lib/action-suggestions/types";

const ProposalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  actionType: z.enum([
    "scale_budget",
    "pause_campaign",
    "duplicate_audience",
    "refresh_creative",
    "review_campaign"
  ]),
  metaCampaignId: z.string().nullable().optional(),
  budgetIncreasePercent: z.number().min(1).max(50).nullable().optional(),
  learningTitle: z.string().max(200).nullable().optional(),
  linkedLearningId: z.string().uuid().nullable().optional(),
  evidenceReason: z.string().max(500).optional()
});

export const ChatAgentResponseSchema = z.object({
  answer: z.string().min(1).max(4000),
  proposals: z.array(ProposalSchema).max(5)
});

export type ChatAgentProposal = z.infer<typeof ProposalSchema> & {
  tempId: string;
  executable: boolean;
};

export type ChatAgentResult = {
  answer: string;
  proposals: ChatAgentProposal[];
  modelMeta: { modelRequested: string; modelUsed: string; fallbackFrom?: string };
};

const EXECUTABLE: ActionSuggestionType[] = ["pause_campaign", "scale_budget"];

function proposalTempId(p: z.infer<typeof ProposalSchema>, index: number): string {
  return `p-${index}-${p.metaCampaignId ?? "x"}-${p.actionType}`;
}

export async function generateChatAgentResponse(args: {
  apiKey: string;
  tenantId: string;
  client: Client;
  message: string;
  meetingMode: boolean;
  modelChain: string[];
}): Promise<ChatAgentResult> {
  const [brain, signalsCtx] = await Promise.all([
    getClientBrainContext(args.tenantId, args.client.id),
    loadClientSignals(args.tenantId, args.client.id, 7)
  ]);

  const signalDrafts = signalsCtx
    ? signalsToActionDrafts(
        signalsCtx.signals,
        args.client.id,
        slugify(args.client.name),
        signalsCtx.windowDays,
        signalsCtx.totalSpend
      ).slice(0, 5)
    : [];

  const campaignLines = signalsCtx?.current
    .slice(0, 12)
    .map(
      (c) =>
        `- ${c.campaignName} (${c.metaCampaignId}): spend R$${c.spend.toFixed(0)}, conv=${c.conversions}, CPA=${c.cpa?.toFixed(2) ?? "—"}, ROAS=${c.roas.toFixed(2)}`
    )
    .join("\n");

  const draftLines =
    signalDrafts.length > 0
      ? signalDrafts
          .map(
            (d, i) =>
              `${i + 1}. [${d.actionType}] ${d.title} — ${d.description.slice(0, 160)} (campanha: ${d.metaCampaignId ?? "n/a"})`
          )
          .join("\n")
      : "(nenhum rascunho automático)";

  const learningLines =
    brain.recentLearnings
      .slice(0, 8)
      .map((l) => `- [${l.id}] ${l.title}: ${l.description.slice(0, 100)}`)
      .join("\n") || "(nenhum)";

  const prompt = [
    args.meetingMode
      ? "Você está em Modo Reunião. Tom consultivo e estruturado."
      : "Você é copiloto de performance marketing da agência.",
    "Responda em português.",
    "Use o contexto abaixo. Se faltar dado, diga explicitamente.",
    "",
    "Tarefa:",
    "1) Escreva `answer` (texto claro para o gestor).",
    "2) Preencha `proposals`: até 3 ações concretas que o gestor pode aprovar.",
    "   - Prefira campanhas listadas nos sinais/rascunhos.",
    "   - `pause_campaign` e `scale_budget` são executáveis na Meta; outras são recomendações.",
    "   - Cite `learningTitle` / `linkedLearningId` quando um aprendizado embasar a proposta.",
    "   - `evidenceReason` = uma frase do porquê.",
    "",
    `Cliente: ${args.client.name}`,
    "",
    "Memória:",
    brain.summaryText,
    "",
    "Aprendizados:",
    learningLines,
    "",
    "Campanhas (7d):",
    campaignLines ?? "(sem métricas)",
    "",
    "Rascunhos de sinais:",
    draftLines,
    "",
    `Pergunta: ${args.message}`
  ].join("\n");

  // Roteador de IA: tarefa de propor ações = acertividade (tende a Claude quando
  // habilitado; cai para Gemini se a flag/chave Claude não estiver disponível).
  const { data, meta } = await aiGenerateJson({
    task: { kind: "agent_proposal", complexity: "medium", label: "brain.chat.proposals" },
    prompt,
    schema: ChatAgentResponseSchema,
    geminiApiKey: args.apiKey
  });
  const modelMeta = {
    modelRequested: `${meta.provider}:${meta.model}`,
    modelUsed: `${meta.provider}:${meta.model}`,
    fallbackFrom: meta.fellBackFrom
      ? `${meta.fellBackFrom.provider}:${meta.fellBackFrom.model}`
      : undefined
  };

  let proposals: ChatAgentProposal[] = data.proposals.map((p, i) => ({
    ...p,
    metaCampaignId: p.metaCampaignId ?? null,
    tempId: proposalTempId(p, i),
    executable: EXECUTABLE.includes(p.actionType)
  }));

  if (!proposals.length && signalDrafts.length) {
    proposals = signalDrafts.slice(0, 3).map((d, i) => ({
      title: d.title,
      description: d.description,
      actionType: d.actionType,
      metaCampaignId: d.metaCampaignId ?? null,
      budgetIncreasePercent: d.actionPayload.budgetIncreasePercent ?? null,
      learningTitle: brain.topLearnings[0]?.title ?? null,
      linkedLearningId: d.linkedLearningIds?.[0] ?? null,
      evidenceReason: d.evidence.reason ?? "Sinal de campanha",
      tempId: `signal-${i}-${d.metaCampaignId ?? "x"}`,
      executable: EXECUTABLE.includes(d.actionType)
    }));
  }

  return {
    answer: data.answer,
    proposals: proposals.slice(0, 3),
    modelMeta
  };
}
