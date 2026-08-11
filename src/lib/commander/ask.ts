import "server-only";

import { z } from "zod";

import {
  getClientCampaignMetrics,
  getClientCampaignMetricsForRange,
  getClientMetricsTodayLive
} from "@/lib/agency-brain/metrics-input";
import { parsePeriodPhrase } from "@/lib/commander/period-phrase";
import { simulateRule } from "@/lib/automation/simulate";
import type { CommanderActionChip, CommanderRuleProposal } from "@/lib/commander/types";
import { aiGenerateJson } from "@/lib/ai/generate";
import type { AiProvider } from "@/lib/ai/types";

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

export type AskHistoryTurn = { role: "user" | "assistant"; content: string };

// Mesmo vocabulário do motor (`POST /api/automation/rules`). `schedule_toggle` fica de
// fora (não simulável) e `notify_email` também (o modelo não conhece o e-mail de destino).
const ProposalConditionItem = z.object({
  metric: z.enum(["cpl", "cpa", "ctr", "spend", "conversions", "roas", "clicks", "cpm", "frequency"]),
  op: z.enum(["gt", "lt", "gte"]),
  value: z.number()
});

// Ação de uma vez só sobre uma campanha real desta conversa — NUNCA uma regra recorrente.
// `metaCampaignId` tem que vir de uma campanha listada na seção Memória do prompt; o
// resultado é filtrado contra essa lista depois (o modelo não pode inventar um id).
const ActionChipSchema = z.object({
  title: z.string().min(1).max(120),
  evidence: z.string().min(1).max(160),
  metaCampaignId: z.string().min(1),
  campaignName: z.string().min(1).max(200),
  actionType: z.enum(["pause_campaign", "reactivate_campaign", "adjust_budget_percent"]),
  budgetPercent: z.number().min(-50).max(50).nullable()
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
  budgetPercent: z.number().min(-50).max(50).nullable()
});

/** Salva-vidas: se o modelo desobedecer e devolver `answer` como objeto (campos separados por
 * seção) em vez de texto corrido, achata em parágrafos em vez de derrubar a resposta inteira. */
function flattenAnswerIfObject(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value;
  return Object.values(value as Record<string, unknown>)
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .join("\n\n");
}

const AnswerSchema = z.object({
  /** Resposta em pt-BR — curta e assertiva sempre (~180 palavras mesmo em análise);
   * o teto aqui é só uma rede de segurança, não a meta de tamanho. */
  answer: z.preprocess(flattenAnswerIfObject, z.string().min(1).max(3000)),
  /** Só quando o usuário pediu explicitamente uma regra/automação. */
  ruleProposal: RuleProposalSchema.nullable(),
  /** No máximo 2 — só campanhas com dado real listado na Memória desta conversa. */
  actionChips: z.array(ActionChipSchema).max(2).default([])
});

export type AskCommanderResult = {
  provider: AiProvider;
  modelRequested: string;
  modelUsed: string;
  fallbackFrom?: string;
  usage?: { inputTokens: number; outputTokens: number; costUsd?: number };
  answer: string;
  ruleProposal: CommanderRuleProposal | null;
  actionChips: CommanderActionChip[];
};

function formatBudget(value?: number): string {
  return value && value > 0 ? `R$ ${value.toFixed(2)}/dia` : "não definido";
}

/**
 * Responde uma pergunta do usuário no contexto do criador de campanha.
 * Contexto = rascunho (resumo) + dossiê dos Scientists (se houver) + memória do Brain
 * (métricas reais dos últimos 7 dias, só quando a flag `campaigns.commander.memory` permite).
 * Provider: resolvido pelo roteador de IA (`aiGenerateJson`), mesma convenção dos
 * Scientists e do veredito — `agent_proposal` porque o chat pode emitir uma proposta de
 * regra acionável, o que pede o tier de mais acertividade (Claude quando habilitado);
 * fallback cross-provider já é resolvido dentro do roteador.
 */
export async function askCommander(input: {
  tenantId: string;
  clientId: string;
  clientName: string;
  question: string;
  /** Ausente/null fora do criador de campanha — não é "rascunho vazio", é "sem rascunho". */
  draft?: AskDraftSummary | null;
  insights?: AskInsightSummary[];
  /** Últimas trocas da conversa persistida (mais antiga primeiro) — memória multi-turn. */
  history?: AskHistoryTurn[];
  memoryEnabled: boolean;
  /** Token da sessão Meta do usuário — só usado pra quebra POR HORA (fetch ao vivo, sem
   * snapshot sincronizado pra isso). Ausente = cai pro fallback diário normal. */
  metaAccessToken?: string | null;
  /** Flag `campaigns.commander.ruleProposals` — desligada, o chat nunca propõe regra. */
  ruleProposalsEnabled?: boolean;
  /** Flag `campaigns.commander.parametersContext` — metas do cliente no contexto. */
  parametersEnabled?: boolean;
  /** Fases REAIS do que está acontecendo agora (não decorativo) — pra UI de progresso. */
  emit?: (phase: string) => void;
}): Promise<AskCommanderResult> {
  input.emit?.("Coletando histórico e métricas reais…");
  const ruleProposalsEnabled = input.ruleProposalsEnabled !== false;
  const lines: string[] = [
    "Você é o Orion Commander — o comando estratégico de tráfego pago da plataforma Orion.",
    "Responda em português do Brasil. Use APENAS os dados reais no contexto abaixo — nunca invente",
    "métrica, resultado ou número de mercado que você não tem como saber. Se faltar informação,",
    "diga exatamente o que falta e como obter, em vez de generalizar.",
    "",
    "Seja curto e assertivo — SEMPRE, mesmo em análise/resumo. Você é um analista sênior que já",
    "leu os números e vai direto ao ponto, não um relatório. Máximo ~180 palavras (bem menos se a",
    "pergunta for pontual). Frases curtas. Zero introdução, zero 'vamos analisar', zero conclusão",
    "genérica tipo 'continue monitorando'. Corte qualquer frase que não mude a decisão do usuário.",
    "",
    "Estrutura mental (não precisa rotular nem numerar na resposta, só guiar o que você escolhe",
    "dizer): o que mais importa agora (1 destaque, 1 problema — não liste tudo, escolha o que pesa",
    "mais no resultado); a hipótese do PORQUÊ do problema (criativo, público, oferta, orçamento —",
    "não só 'teve resultado ruim'); 1 ação concreta e específica desta conta como próximo passo.",
    "Se fizer sentido citar uma referência geral de mercado pro tipo de objetivo, pode — mas deixe",
    "claro que é geral, nunca invente fonte/número específico que você não tem de verdade.",
    "",
    "IMPORTANTE sobre o formato: `answer` é SEMPRE uma única string de texto corrido (nunca um",
    "objeto/JSON aninhado com campo por seção) — parágrafos curtos separados por quebra de linha.",
    "",
    ...(ruleProposalsEnabled
      ? [
          "Se — e somente se — o usuário pedir para criar uma regra/automação (ex.: 'crie uma regra",
          "que pause campanhas com CPA acima de 50'), preencha `ruleProposal` traduzindo o pedido:",
          "métricas: cpl, cpa, ctr (em %), spend (R$ na janela), conversions, roas, clicks, cpm (R$), frequency;",
          "operadores: gt, lt, gte; `groups` = listas de condições em E, combinadas em OU;",
          "`minSpend` = gasto mínimo em R$ para avaliar a campanha (use null se não citado);",
          "ações: pause_campaign, alert_only, adjust_budget_percent (+budgetPercent), reactivate_campaign,",
          "scale_gradual (+budgetPercent). budgetPercent negativo REDUZ o orçamento (ex.: -20).",
          "No `answer`, explique a regra proposta em 1 parágrafo e avise",
          "que ela será criada em modo de aprovação. Caso contrário, retorne ruleProposal = null."
        ]
      : ["Sempre retorne ruleProposal = null (criação de regras está desativada)."]),
    "",
    "Sobre `actionChips` (até 2): quando você identificar, dentro da própria análise, uma AÇÃO",
    "PONTUAL e específica sobre UMA campanha real listada na seção Memória abaixo (pausar,",
    "reativar ou ajustar orçamento) — não uma regra recorrente, uma ação de agora — preencha um",
    "item em `actionChips` usando o `metaCampaignId` EXATO dessa campanha (copie da lista, nunca",
    "invente). `evidence` = o número real que justifica (gasto, conversões, período), curto.",
    "`title` = a ação em poucas palavras (ex.: 'Pausar \"Nome da campanha\"'). Só preencha quando",
    "houver dado real na Memória — sem isso, deixe `actionChips` vazio. Cada campanha citada",
    "no `answer` como ação recomendada é uma boa candidata a virar chip.",
    "",
    `Cliente: ${input.clientName}`
  ];

  if (input.draft) {
    lines.push(
      "",
      "== Rascunho da campanha (você está dentro do criador de campanha agora) ==",
      `Objetivo: ${input.draft.objective ?? "não definido"}`,
      `Nome: ${input.draft.campaignName ?? "não definido"}`,
      `Orçamento diário: ${formatBudget(input.draft.dailyBudgetBRL)}`,
      `Conjunto: ${input.draft.adsetName ?? "não definido"}`,
      `Criativo com mídia: ${input.draft.hasMedia ? "sim" : "não"}`,
      `Persona selecionada: ${input.draft.personaSelected ? "sim" : "não"}`,
      input.draft.step ? `Passo atual do criador: ${input.draft.step}` : ""
    );
  } else {
    lines.push(
      "",
      "Esta conversa NÃO é dentro do criador de campanha — não existe rascunho, e você não deve",
      "mencionar campos de rascunho, campanha em edição ou pedir pra 'definir objetivo/orçamento'.",
      "É uma conversa geral sobre a conta do cliente — responda com base no histórico de métricas",
      "reais abaixo (se houver) e no que o usuário perguntar."
    );
  }

  // Commander › Parameters (Fase 4): metas estratégicas do cliente no contexto — o
  // Commander coordena a partir dos parâmetros, e propostas de regra nascem alinhadas
  // a eles. Best-effort: sem metas configuradas, a seção simplesmente não aparece.
  if (input.parametersEnabled !== false) try {
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

  // Populado dentro da seção Memória — só campanhas realmente listadas no prompt podem
  // virar `actionChips` depois (defesa contra o modelo inventar um metaCampaignId).
  const knownCampaigns = new Map<string, string>();

  if (input.memoryEnabled) {
    const periodMatch = parsePeriodPhrase(input.question);
    const rows = periodMatch
      ? await getClientCampaignMetricsForRange(input.clientId, periodMatch.since, periodMatch.until)
      : await getClientCampaignMetrics(input.tenantId, input.clientId, 7);
    const periodLabel = periodMatch ? periodMatch.label : "últimos 7 dias";
    const sorted = [...rows].sort((a, b) => b.spend - a.spend);
    const MAX_CAMPAIGNS = 15;
    const top = sorted.slice(0, MAX_CAMPAIGNS);
    const omitted = sorted.length - top.length;

    if (periodMatch?.note) {
      lines.push("", periodMatch.note);
    }

    // Quebra por hora: só busca ao vivo na Meta quando o pedido for explicitamente por
    // hora — não é chamada de toda pergunta, só desse caso específico.
    if (periodMatch?.isHourly && input.metaAccessToken) {
      input.emit?.("Buscando quebra por hora ao vivo na Meta…");
      try {
        const live = await getClientMetricsTodayLive(input.clientId, input.metaAccessToken);
        if (live.byHour.length) {
          lines.push(
            "",
            "== Quebra por hora, hoje (ao vivo na Meta, total da conta) ==",
            ...live.byHour.map(
              (h) => `- ${h.hour}: gasto R$ ${h.spend.toFixed(2)}, ${h.conversions} conversão(ões)`
            )
          );
        }
        if (live.byCampaign.length) {
          lines.push(
            "",
            "== Por campanha, hoje (ao vivo na Meta — use isto pra dizer QUAL campanha) ==",
            ...live.byCampaign.map(
              (c) =>
                `- ${c.campaignName}: gasto R$ ${c.spend.toFixed(2)}, ${c.conversions} conv., ` +
                `CTR ${c.ctr.toFixed(2)}%, CPA ${c.cpa != null ? `R$ ${c.cpa.toFixed(2)}` : "—"}`
            )
          );
        }
      } catch {
        /* fetch ao vivo é best-effort — a resposta segue com o total diário de hoje abaixo */
      }
    }

    for (const r of top) {
      if (r.metaCampaignId) knownCampaigns.set(r.metaCampaignId, r.campaignName);
    }

    if (sorted.length) {
      const totals = sorted.reduce(
        (acc, r) => ({
          spend: acc.spend + r.spend,
          conversions: acc.conversions + r.conversions
        }),
        { spend: 0, conversions: 0 }
      );
      const blendedCpa = totals.conversions > 0 ? totals.spend / totals.conversions : null;
      lines.push(
        "",
        `== Memória (campanhas reais — ${periodLabel}) ==`,
        `Total da conta: R$ ${totals.spend.toFixed(2)} em ${sorted.length} campanha(s), ` +
          `${totals.conversions} conversões no total, CPA médio ponderado ` +
          `${blendedCpa != null ? `R$ ${blendedCpa.toFixed(2)}` : "— (sem conversão)"}.`,
        "Por campanha (ordenado por gasto):",
        ...top.map(
          (r) =>
            `- ${r.campaignName}: gasto R$ ${r.spend.toFixed(2)}, ${r.conversions} conv., ` +
            `CTR ${r.ctr.toFixed(2)}%, CPA ${r.cpa != null ? `R$ ${r.cpa.toFixed(2)}` : "—"}, ROAS ${r.roas.toFixed(2)}`
        ),
        omitted > 0 ? `(+ ${omitted} campanha(s) menores, omitidas aqui — já contam nos totais acima)` : ""
      );
    } else {
      lines.push("", `== Memória (campanhas reais — ${periodLabel}) ==`, "(sem métricas sincronizadas no período)");
    }
  }

  if (input.history?.length) {
    lines.push(
      "",
      "== Histórico da conversa (mais antiga primeiro) ==",
      ...input.history.map((h) => `${h.role === "user" ? "Usuário" : "Commander"}: ${h.content}`)
    );
  }

  lines.push("", `== Pergunta do usuário ==`, input.question.trim());
  const prompt = lines.filter((l) => l !== "").join("\n");

  // Nunca expor pro usuário qual provedor (Claude/Gemini) está por trás — é detalhe
  // interno do roteador de IA, não algo pra vazar na UI.
  const task = { kind: "agent_proposal" as const, complexity: "medium" as const, label: "commander.ask" };
  input.emit?.("Consultando a IA do Orion…");

  const { data, meta } = await aiGenerateJson({
    task,
    prompt,
    schema: AnswerSchema,
    temperature: 0.4
  });
  const ruleProposal =
    ruleProposalsEnabled && data.ruleProposal
      ? await buildRuleProposal(input.tenantId, input.clientId, data.ruleProposal)
      : null;

  // Nunca confia no metaCampaignId/campaignName ecoado pelo modelo — só aceita chip cuja
  // campanha realmente apareceu na seção Memória, e usa o nome real (não o que o modelo repetiu).
  const actionChips: CommanderActionChip[] = data.actionChips
    .filter((c) => knownCampaigns.has(c.metaCampaignId))
    .slice(0, 2)
    .map((c) => ({
      title: c.title,
      evidence: c.evidence,
      metaCampaignId: c.metaCampaignId,
      campaignName: knownCampaigns.get(c.metaCampaignId)!,
      actionType: c.actionType,
      budgetPercent: c.actionType === "adjust_budget_percent" ? (c.budgetPercent ?? 10) : null
    }));

  return {
    provider: meta.provider,
    modelRequested: meta.model,
    modelUsed: meta.model,
    fallbackFrom: meta.fellBackFrom ? `${meta.fellBackFrom.provider}:${meta.fellBackFrom.model}` : undefined,
    usage: meta.usage,
    answer: data.answer,
    ruleProposal,
    actionChips
  };
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
