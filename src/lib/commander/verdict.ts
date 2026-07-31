import "server-only";

import { z } from "zod";

import { aiGenerateJson } from "@/lib/ai/generate";
import type { AiGenerateMeta } from "@/lib/ai/types";

export type CommanderVerdictDomain = "campaign" | "persona" | "zone";

export type CommanderVerdictChecklistItem = { label: string; complete: boolean };

const VerdictSchema = z.object({
  verdict: z.enum(["approve", "needs_work"]),
  headline: z.string().min(4).max(140),
  reasons: z.array(z.string().min(4).max(240)).min(1).max(5),
  fixes: z.array(z.string().min(4).max(240)).max(5),
  confidence: z.number().min(0).max(100)
});

export type CommanderVerdict = z.infer<typeof VerdictSchema>;

const DOMAIN_LABEL: Record<CommanderVerdictDomain, string> = {
  campaign: "campanha",
  persona: "persona (público-alvo)",
  zone: "zona geográfica"
};

/**
 * Veredito final do Commander: em vez de julgar o rascunho a cada passo (motor de
 * regras determinístico reavaliando estado incompleto — a fonte dos avisos "zuados"),
 * essa função roda UMA VEZ na revisão final, com tudo que foi preenchido, e devolve um
 * veredito assertivo. Segue a mesma convenção dos Scientists (`aiGenerateJson`), não a
 * do chat (`llmGenerateJson`) — é trabalho analítico único, não conversa.
 */
export async function generateCommanderVerdict(input: {
  domain: CommanderVerdictDomain;
  contextSummary: string;
  checklist: CommanderVerdictChecklistItem[];
}): Promise<{ verdict: CommanderVerdict; meta: AiGenerateMeta }> {
  const checklistText = input.checklist.length
    ? input.checklist.map((item) => `- [${item.complete ? "OK" : "PENDENTE"}] ${item.label}`).join("\n")
    : "(sem checklist automático para este domínio)";

  const prompt = [
    `Você é o Orion Commander. Analise tudo que foi preenchido na criação de uma ${DOMAIN_LABEL[input.domain]}`,
    "e dê um veredito final, direto e acionável — não fique em cima do muro.",
    "Responda em português do Brasil.",
    "",
    "== O que foi preenchido durante o processo ==",
    input.contextSummary || "(nada preenchido ainda)",
    "",
    "== Checklist automático ==",
    checklistText,
    "",
    "Tarefa: `verdict` = 'approve' (pode seguir em frente) ou 'needs_work' (tem algo real",
    "que vale corrigir antes). `headline` = uma frase curta resumindo o veredito.",
    "`reasons` (1 a 5) = o que embasa o veredito, com base no que foi preenchido — seja específico.",
    "`fixes` (0 a 5) = ações concretas a fazer antes de seguir (vazio quando verdict = approve).",
    "`confidence` (0-100) = sua confiança no veredito dado o quanto já foi preenchido.",
    "Nunca invente dado que não está no contexto acima."
  ].join("\n");

  const { data, meta } = await aiGenerateJson({
    task: { kind: "analysis", complexity: "medium", label: `commander.verdict.${input.domain}` },
    prompt,
    schema: VerdictSchema
  });
  return { verdict: data, meta };
}
