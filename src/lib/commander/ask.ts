import "server-only";

import { z } from "zod";

import { getClientCampaignMetrics } from "@/lib/agency-brain/metrics-input";
import { simulateRule } from "@/lib/automation/simulate";
import type { CommanderRuleProposal } from "@/lib/commander/types";
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

// Mesmo vocabulário do motor (`POST /api/automation/rules`). `schedule_toggle` fica de
// fora (não simulável) e `notify_email` também (o modelo não conhece o e-mail de destino).
const ProposalConditionItem = z.object({
  metric: z.enum(["cpl", "cpa", "ctr", "spend", "conversions", "roas"]),
  op: z.enum(["gt", "lt", "gte"]),
  value: z.number()
});

const RuleProposalSchema = z.object({
  name: z.string().min(1).max(120),
  /** E dentro do grupo, OU entre grupos (DNF — igual ao motor). */
  groups: z.array(z.array(ProposalConditionItem).min(1).max(5)).min(1).max(4),
  minSpend: z.number().min(0).nullable(),
  actionType: z.enum([
    "pause_campaign",
    "alert_only",
    "adjust_budget_percent",
    "reactivate_campaign",
    "scale_gradual"
  ]),
  budgetPercent: z.number().min(1).max(50).nullable()
});

const AnswerSchema = z.object({
  /** Resposta em pt-BR, direta, máx. ~3 parágrafos curtos. */
  answer: z.string().min(1).max(2000),
  /** Só quando o usuário pediu explicitamente uma regra/automação. */
  ruleProposal: RuleProposalSchema.nullable()
});

export type AskCommanderResult = LlmGenerateMeta & {
  answer: string;
  ruleProposal: CommanderRuleProposal | null;
};

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
    "Você é o Orion Commander — o comando estratégico de tráfego pago da plataforma Orion.",
    "Responda em português do Brasil, direto e acionável, no máximo 3 parágrafos curtos.",
    "Use APENAS o contexto abaixo. Se faltar informação, diga o que falta e como obter.",
    "Nunca invente métricas ou resultados.",
    "",
    "Se — e somente se — o usuário pedir para criar uma regra/automação (ex.: 'crie uma regra",
    "que pause campanhas com CPA acima de 50'), preencha `ruleProposal` traduzindo o pedido:",
    "métricas: cpl, cpa, ctr (em %), spend (R$ na janela de 7 dias), conversions, roas;",
    "operadores: gt, lt, gte; `groups` = listas de condições em E, combinadas em OU;",
    "`minSpend` = gasto mínimo em R$ para avaliar a campanha (use null se não citado);",
    "ações: pause_campaign, alert_only, adjust_budget_percent (+budgetPercent), reactivate_campaign,",
    "scale_gradual (+budgetPercent). No `answer`, explique a regra proposta em 1 parágrafo e avise",
    "que ela será criada em modo de aprovação. Caso contrário, retorne ruleProposal = null.",
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

  // Commander › Parameters (Fase 4): metas estratégicas do cliente no contexto — o
  // Commander coordena a partir dos parâmetros, e propostas de regra nascem alinhadas
  // a eles. Best-effort: sem metas configuradas, a seção simplesmente não aparece.
  try {
    const { getParameters } = await import("@/lib/commander/parameters");
    const params = await getParameters(input.tenantId, { clientId: input.clientId });
    if (params.goals) {
      const g = params.goals;
      const goalParts = [
        g.maxCpa != null ? `CPA máx R$ ${g.maxCpa}` : null,
        g.maxCpl != null ? `CPL máx R$ ${g.maxCpl}` : null,
        g.maxCpc != null ? `CPC máx R$ ${g.maxCpc}` : null,
        g.minCtr != null ? `CTR mín ${g.minCtr}%` : null,
        g.minRoas != null ? `ROAS mín ${g.minRoas}` : null,
        g.maxSpendWithoutConversion != null
          ? `gasto máx sem conversão R$ ${g.maxSpendWithoutConversion}`
          : null
      ].filter(Boolean);
      if (goalParts.length) {
        lines.push(
          "",
          "== Metas do cliente (Parameters) ==",
          goalParts.join(" · "),
          "Alinhe recomendações e propostas de regra a estas metas."
        );
      }
    }
  } catch {
    // parâmetros são contexto opcional — nunca derrubam o chat
  }

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
      const ruleProposal = data.ruleProposal
        ? await buildRuleProposal(input.tenantId, input.clientId, data.ruleProposal)
        : null;
      return { ...meta, answer: data.answer, ruleProposal };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

/**
 * Aresta Commander→Engine: transforma a saída do LLM no artefato "proposta de regra"
 * (payload do `POST /api/automation/rules`) com a simulação de 30 dias anexada — a
 * proposta nunca viaja sem evidência. Quem cria a regra é o usuário, via botão no painel.
 */
async function buildRuleProposal(
  tenantId: string,
  clientId: string,
  raw: z.infer<typeof RuleProposalSchema>
): Promise<CommanderRuleProposal> {
  const needsPercent = raw.actionType === "adjust_budget_percent" || raw.actionType === "scale_gradual";
  const condition = {
    groups: raw.groups,
    ...(raw.minSpend != null && raw.minSpend > 0 ? { minSpend: raw.minSpend } : {})
  };
  const action = {
    type: raw.actionType,
    ...(needsPercent ? { budgetPercent: raw.budgetPercent ?? 10 } : {})
  };

  let simulation: CommanderRuleProposal["simulation"] = null;
  try {
    const result = await simulateRule(tenantId, { condition, action, clientId, days: 30 });
    simulation = result.supported
      ? {
          supported: true,
          days: result.days,
          campaignsTriggered: result.totals.campaignsTriggered,
          alertDays: result.totals.alertDays,
          avoidedSpend: result.totals.avoidedSpend,
          dailyBudgetIncrease: result.totals.dailyBudgetIncrease
        }
      : { supported: false, days: 0, campaignsTriggered: 0, alertDays: 0, avoidedSpend: 0, dailyBudgetIncrease: 0 };
  } catch {
    /* simulação é best-effort — a proposta continua válida sem ela */
  }

  return {
    name: raw.name,
    clientId,
    condition,
    action,
    // Escada de confiança: proposta vinda de conversa nasce pedindo aprovação; só
    // alerta puro pode nascer `auto`.
    executionMode: raw.actionType === "alert_only" ? "auto" : "approval",
    simulation
  };
}
