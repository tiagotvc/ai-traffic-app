import { adHasMedia, computeDraftScore, getActiveAd, getActiveAdset, type CampaignDraftPayload } from "@/lib/campaign-draft";
import type { CommanderInsight, CommanderPipelineStep, CommanderState } from "./types";

const PIPELINE = [
  ["briefing", "Briefing analisado", "Objetivo, cliente e conta identificados."],
  ["brain", "Contexto do rascunho", "Validando os dados disponíveis na campanha."],
  ["audience", "Audience Scientist", "Verificando público e segmentação configurados."],
  ["creative", "Creative Scientist", "Verificando mídia e mensagem do anúncio."],
  ["benchmark", "Benchmark Scientist", "Aguardando integração com histórico e benchmarks."],
  ["engine", "Recommendation Engine", "Consolidando as regras locais."]
] as const;

export class CommanderService {
  analyzeCampaignDraft(draft: CampaignDraftPayload): CommanderState {
    const adset = getActiveAdset(draft);
    const ad = getActiveAd(draft);
    const checks = [
      Boolean(draft.clientSlug && draft.adAccountId),
      Boolean(draft.campaign.name && draft.objective),
      Boolean(adset.name),
      adHasMedia(ad),
      draft.campaign.dailyBudgetBRL >= 1
    ];
    const completed = checks.filter(Boolean).length;
    const runningIndex = Math.min(completed, PIPELINE.length - 1);
    const pipeline: CommanderPipelineStep[] = PIPELINE.map(([key, label, description], index) => ({
      key,
      label,
      description,
      status: index < completed ? "done" : index === runningIndex ? "running" : "pending"
    }));
    const insights: CommanderInsight[] = [];
    if (!draft.campaign.dailyBudgetBRL) insights.push({
      id: "budget", type: "warning", title: "Orçamento diário ainda não definido",
      description: "Defina um orçamento para melhorar a previsibilidade da campanha.",
      impact: "high", confidence: 94, source: "Budget Scientist", actionLabel: "Corrigir agora"
    });
    if (!adHasMedia(ad)) insights.push({
      id: "creative", type: "recommendation", title: "Criativo ainda não selecionado",
      description: "Adicionar mídia ajuda o Creative Scientist a avaliar o potencial do anúncio.",
      impact: "high", confidence: 91, source: "Creative Scientist"
    });
    if (!adset.personaId) insights.push({
      id: "audience", type: "opportunity", title: "Público pode ser refinado",
      description: "Uma persona salva pode tornar a segmentação mais consistente.",
      impact: "medium", confidence: 82, source: "Audience Scientist"
    });
    if (draft.clientSlug && draft.adAccountId) insights.push({
      id: "benchmark", type: "benchmark", title: "Contexto da conta identificado",
      description: "O Commander está pronto para comparar esta campanha ao histórico disponível.",
      impact: "low", confidence: 88, source: "Benchmark Scientist"
    });

    const confidence = Math.max(36, Math.min(96, Math.round((computeDraftScore(draft) + completed * 12) / 1.6)));
    const missing = checks.findIndex((value) => !value);
    const next = [
      ["Selecionar cliente e conta", "Conecte o contexto necessário para iniciar a análise.", "select_account"],
      ["Definir objetivo e campanha", "Complete as informações principais da campanha.", "complete_campaign"],
      ["Configurar o público", "Revise conjunto, segmentação e posicionamentos.", "complete_audience"],
      ["Adicionar criativo", "Selecione a mídia e complete a mensagem do anúncio.", "complete_creative"],
      ["Definir orçamento diário", "Informe o investimento planejado para a campanha.", "complete_budget"]
    ][missing < 0 ? 4 : missing]!;

    return {
      status: completed === checks.length ? "complete" : insights.some((item) => item.type === "warning") ? "warning" : "ready",
      confidence,
      activeScientist: pipeline.find((item) => item.status === "running")?.label,
      insightsCount: insights.length,
      pipeline,
      insights,
      nextAction: {
        label: completed === checks.length ? "Revisar e publicar" : next[0],
        description: completed === checks.length ? "A campanha está pronta para sua revisão final." : next[1],
        actionType: completed === checks.length ? "review" : next[2]
      }
    };
  }

  getCommanderState(draft: CampaignDraftPayload) { return this.analyzeCampaignDraft(draft); }
  getInsights(draft: CampaignDraftPayload) { return this.analyzeCampaignDraft(draft).insights; }
  getRecommendedNextAction(draft: CampaignDraftPayload) { return this.analyzeCampaignDraft(draft).nextAction; }
  // O chat real vive em src/lib/commander/ask.ts (server, LLM + contexto) — não aqui.
}

export const commanderService = new CommanderService();
