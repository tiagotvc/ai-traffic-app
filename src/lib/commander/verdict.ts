import "server-only";

import { z } from "zod";

import { aiGenerateJson } from "@/lib/ai/generate";
import type { AiGenerateMeta } from "@/lib/ai/types";

export type CommanderVerdictDomain = "campaign" | "persona" | "zone";

export type CommanderVerdictChecklistItem = { label: string; complete: boolean };

const VerdictSchema = z.object({
  verdict: z.enum(["approve", "needs_work"]),
  headline: z.string().min(4).max(140),
  reasons: z.array(z.string().min(4).max(400)).min(1).max(5),
  fixes: z.array(z.string().min(4).max(400)).max(5),
  /** Sugestões criativas/de copy baseadas no negócio do cliente — sempre que fizer sentido, mesmo em approve. */
  suggestions: z.array(z.string().min(4).max(400)).max(5),
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
  /** Nicho/negócio do cliente (ex.: Client.niche) — dá base pra sugestões de copy de verdade. */
  clientContext?: string | null;
}): Promise<{ verdict: CommanderVerdict; meta: AiGenerateMeta }> {
  const checklistText = input.checklist.length
    ? input.checklist.map((item) => `- [${item.complete ? "OK" : "PENDENTE"}] ${item.label}`).join("\n")
    : "(sem checklist automático para este domínio)";

  const prompt = [
    `Você é o Orion Commander. Analise tudo que foi preenchido na criação de uma ${DOMAIN_LABEL[input.domain]}`,
    "e dê um veredito final, direto e acionável — não fique em cima do muro.",
    "Responda em português do Brasil.",
    "",
    "IMPORTANTE: o checklist abaixo é só automático (confere se um campo foi preenchido ou não —",
    "'tem texto: sim/não'). Ele NÃO substitui sua própria leitura crítica. Quando houver texto de",
    "verdade no contexto (título/copy de anúncio, descrição de negócio, briefing etc.), LEIA e",
    "avalie a qualidade de verdade: o texto faz sentido, está bem escrito, é persuasivo, tem erro",
    "de português, está incompleto ou parece rascunho/placeholder ('teste', 'aaaa', texto",
    "desconexo)? Um campo 'preenchido' com um texto ruim não é motivo para aprovar — aponte isso",
    "explicitamente nos `reasons`/`fixes` mesmo que o checklist automático diga que está tudo OK.",
    "",
    "Quando houver público-alvo (idade/gênero/interesses) E texto de anúncio no contexto, cheque",
    "COERÊNCIA entre os dois: o copy fala a língua desse público específico? Um anúncio para",
    "mulheres de 50 anos com linguagem de gíria jovem, ou um anúncio B2B com tom informal demais",
    "para o público configurado, é um problema real — trate como falha mesmo que o texto em si",
    "esteja bem escrito e o público esteja tecnicamente configurado.",
    "",
    "Use o texto do anúncio (título/legenda) pra IDENTIFICAR que produto ou serviço está sendo",
    "vendido, mesmo sem descrição explícita do negócio — e a partir disso, em `suggestions`,",
    "sugira interesses/públicos do Meta Ads que tendem a converter melhor pra esse produto",
    "específico (não genéricos), além de eventuais melhorias de copy. Sempre que fizer sentido,",
    "preencha `suggestions` mesmo quando o veredito for 'approve' — não é só sobre erro, é sobre",
    "ajudar a vender mais.",
    input.clientContext ? `\n== Sobre o negócio do cliente ==\n${input.clientContext}` : "",
    "",
    "== O que foi preenchido durante o processo ==",
    input.contextSummary || "(nada preenchido ainda)",
    "",
    "== Checklist automático (só estrutura, não qualidade) ==",
    checklistText,
    "",
    "Tarefa: `verdict` = 'approve' (pode seguir em frente) ou 'needs_work' (tem algo real",
    "que vale corrigir antes — incluindo texto malfeito, mesmo que estruturalmente completo).",
    "`headline` = uma frase curta resumindo o veredito.",
    "`reasons` (1 a 5) = o que embasa o veredito, com base no que foi preenchido — seja específico.",
    "`fixes` (0 a 5) = ações concretas a fazer antes de seguir (vazio quando verdict = approve).",
    "`suggestions` (0 a 5) = ideias concretas de copy e/ou interesses de segmentação baseadas no",
    "produto identificado, pra vender melhor — não são obrigatórias pra aprovar, são valor extra.",
    "`confidence` (0-100) = sua confiança no veredito dado o quanto já foi preenchido.",
    "Cada item de `reasons`/`fixes`/`suggestions` deve ser curto e direto (1-2 frases, até ~300",
    "caracteres) — sem enrolação. Texto plano, sem markdown (sem **negrito**, sem listas com * ou",
    "quebra de linha) — cada item é exibido como uma linha simples na tela. Se quiser sugerir",
    "vários interesses ou variações de copy, separe por vírgula na mesma frase, não em lista.",
    "Nunca invente dado que não está no contexto acima."
  ].join("\n");

  const { data, meta } = await aiGenerateJson({
    task: { kind: "analysis", complexity: "medium", label: `commander.verdict.${input.domain}` },
    prompt,
    schema: VerdictSchema
  });
  return { verdict: data, meta };
}
