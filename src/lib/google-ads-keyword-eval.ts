/**
 * Motor determinístico de avaliação de palavras-chave / termos de pesquisa do
 * Google Ads. Fonte única da verdade das recomendações (o análogo, para keywords,
 * de `google-ads-campaign-rules.ts` para campanhas).
 *
 * É uma função **pura**: sem I/O, sem chamadas à API, sem IA. Recebe linhas já
 * lidas (keyword_view / search_term_view) + as metas do cliente (`ClientGoal`) e
 * devolve recomendações com `score`/`confidence` e uma "intenção de ação"
 * (`intent`) normalizada — independente do formato de mutate do Google, que a
 * camada de escrita (M2b, `google-ads-mutations.ts`) traduz na hora de aplicar.
 *
 * O refinamento por IA (opcional, `google-ads-keyword-ai.ts`) roda por cima
 * deste resultado; nunca cria nem altera a `intent` — apenas reordena/explica.
 */

/** Ações que uma recomendação pode propor. */
export type KeywordActionType =
  | "NEGATIVAR"
  | "ADICIONAR_KEYWORD"
  | "PAUSAR"
  | "REDUZIR_LANCE"
  | "AUMENTAR_LANCE";

/** Ações reversíveis e de baixo risco — únicas elegíveis a auto-aplicação. */
const REVERSIBLE_LOW_RISK: ReadonlySet<KeywordActionType> = new Set<KeywordActionType>([
  "NEGATIVAR",
  "PAUSAR"
]);

/** Piso de custo (moeda da conta) abaixo do qual não recomendamos negativar/pausar. */
export const DEFAULT_COST_FLOOR = 30;

export type Metricish = {
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number; // fração 0-1
  averageCpc: number; // moeda
};

export type EvalSearchTermRow = Metricish & {
  searchTerm: string;
  status: string; // ADDED | EXCLUDED | ADDED_EXCLUDED | NONE | UNKNOWN
  triggeringKeyword: string;
  matchType: string;
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
};

export type EvalKeywordRow = Metricish & {
  text: string;
  matchType: string;
  status: string; // ENABLED | PAUSED | REMOVED
  criterionId?: string;
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
};

export type KeywordEvalGoal = {
  /** Alvo de custo por resultado = maxCpa ?? maxCpl. `null` quando não definido. */
  target: number | null;
  /** CTR mínimo (fração 0-1) ou `null`. */
  minCtr: number | null;
  /** Piso de custo (moeda). Default `DEFAULT_COST_FLOOR`. */
  costFloor: number;
  /** Dias na janela analisada (usado no cálculo de confiança). */
  windowDays: number;
};

/**
 * Intenção de ação normalizada. NÃO é o corpo do mutate do Google — a camada de
 * escrita traduz. Guardá-la crua desacopla o motor da API e sobrevive a mudanças
 * de versão do endpoint.
 */
export type KeywordActionIntent =
  | {
      kind: "ADD_NEGATIVE";
      scope: "shared" | "campaign" | "ad_group";
      campaignId: string;
      adGroupId?: string;
      text: string;
      matchType: string;
    }
  | { kind: "ADD_KEYWORD"; adGroupId: string; text: string; matchType: string }
  | {
      kind: "PAUSE_KEYWORD";
      adGroupId: string;
      criterionId?: string;
      text: string;
      matchType: string;
    }
  | {
      kind: "SET_BID";
      adGroupId: string;
      criterionId?: string;
      text: string;
      matchType: string;
      cpcBidMicros: string;
      previousCpcBidMicros: string;
    };

export type KeywordRecommendation = {
  actionType: KeywordActionType;
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  keywordText: string;
  matchType: string;
  signals: Record<string, number | string | boolean>;
  score: number; // 0-1
  confidence: number; // 0-1
  ruleJustification: string;
  autoApplyEligible: boolean;
  intent: KeywordActionIntent;
  /** Chave estável p/ deduplicação entre recomputes (mesma ação repetida atualiza). */
  dedupeKey: string;
  /** Origem: regra determinística (default) ou classificação por IA. */
  source?: "rule" | "ai_refined";
  /** Justificativa da IA (quando `source === "ai_refined"`). */
  aiJustification?: string;
};

export type KeywordEvalInput = {
  searchTerms: EvalSearchTermRow[];
  keywords: EvalKeywordRow[];
  goal: KeywordEvalGoal;
  /**
   * Campanhas em MANUAL_CPC (por id). Só nelas fazem sentido ajustes de lance —
   * em Smart Bidding o `cpcBidMicros` é ignorado. Vazio ⇒ nenhum rec de lance.
   */
  manualCpcCampaignIds?: ReadonlySet<string>;
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function round4(v: number): number {
  return Math.round(v * 1e4) / 1e4;
}

/** Confiança = volume de dados: mais cliques, janela maior e presença de conversão. */
function confidenceFor(clicks: number, conversions: number, windowDays: number): number {
  const raw =
    Math.log10(1 + Math.max(0, clicks)) / 2 +
    Math.min(windowDays, 30) / 60 +
    (conversions > 0 ? 0.2 : 0);
  return round4(clamp(raw, 0, 1));
}

/** Custo mínimo para "gastou demais": max(2×alvo, piso) — ou o piso se não houver alvo. */
function wasteThreshold(goal: KeywordEvalGoal): number {
  return goal.target != null ? Math.max(2 * goal.target, goal.costFloor) : goal.costFloor;
}

function normText(s: string): string {
  return s.trim().toLowerCase();
}

function toMicros(currency: number): string {
  return String(Math.max(0, Math.round(currency * 1e6)));
}

/**
 * Avalia keywords e termos e devolve as recomendações ordenadas por prioridade
 * (`score × confidence`, desc). Determinístico: mesma entrada ⇒ mesma saída.
 */
export function evaluateKeywords(input: KeywordEvalInput): KeywordRecommendation[] {
  const { goal } = input;
  const manualCpc = input.manualCpcCampaignIds ?? new Set<string>();
  const threshold = wasteThreshold(goal);
  const recs: KeywordRecommendation[] = [];

  // ---- Termos de pesquisa ----
  for (const t of input.searchTerms) {
    if (!t.adGroupId || !t.searchTerm) continue;
    const cpa = t.conversions > 0 ? t.cost / t.conversions : Infinity;
    const alreadyKeyword = t.status === "ADDED" || t.status === "ADDED_EXCLUDED";
    const alreadyExcluded = t.status === "EXCLUDED" || t.status === "ADDED_EXCLUDED";

    // R1 — NEGATIVAR: gastou sem converter e ainda não está excluído.
    if (t.conversions === 0 && t.cost >= threshold && !alreadyExcluded) {
      let score = 0.6;
      if (t.cost >= 3 * threshold) score += 0.2;
      if (t.clicks >= 20) score += 0.1;
      score = round4(clamp(score, 0, 0.95));
      const confidence = confidenceFor(t.clicks, t.conversions, goal.windowDays);
      recs.push({
        actionType: "NEGATIVAR",
        campaignId: t.campaignId,
        campaignName: t.campaignName,
        adGroupId: t.adGroupId,
        adGroupName: t.adGroupName,
        keywordText: t.searchTerm,
        matchType: "EXACT",
        signals: { cost: round4(t.cost), clicks: t.clicks, conversions: t.conversions, threshold: round4(threshold) },
        score,
        confidence,
        ruleJustification: `Gastou ${round4(t.cost)} em ${t.clicks} clique(s) sem nenhuma conversão (limite ${round4(threshold)}).`,
        autoApplyEligible: eligible("NEGATIVAR", score, confidence),
        intent: {
          kind: "ADD_NEGATIVE",
          scope: "shared",
          campaignId: t.campaignId,
          adGroupId: t.adGroupId,
          text: t.searchTerm,
          matchType: "EXACT"
        },
        dedupeKey: `NEGATIVAR:${t.adGroupId}:${normText(t.searchTerm)}`
      });
    }

    // R2 — ADICIONAR_KEYWORD: converteu, dentro do alvo, e ainda não é keyword.
    const withinTarget = goal.target == null || cpa <= goal.target;
    if (t.conversions >= 1 && withinTarget && !alreadyKeyword && t.clicks >= 3) {
      let score = 0.6;
      if (t.conversions >= 2) score += 0.2;
      if (goal.target != null && cpa <= 0.7 * goal.target) score += 0.15;
      score = round4(clamp(score, 0, 0.95));
      const confidence = confidenceFor(t.clicks, t.conversions, goal.windowDays);
      recs.push({
        actionType: "ADICIONAR_KEYWORD",
        campaignId: t.campaignId,
        campaignName: t.campaignName,
        adGroupId: t.adGroupId,
        adGroupName: t.adGroupName,
        keywordText: t.searchTerm,
        matchType: "PHRASE",
        signals: {
          cost: round4(t.cost),
          clicks: t.clicks,
          conversions: t.conversions,
          cpa: Number.isFinite(cpa) ? round4(cpa) : -1
        },
        score,
        confidence,
        ruleJustification: `Converteu ${t.conversions}× (CPA ${Number.isFinite(cpa) ? round4(cpa) : "—"}) e ainda não é palavra-chave.`,
        autoApplyEligible: eligible("ADICIONAR_KEYWORD", score, confidence),
        intent: { kind: "ADD_KEYWORD", adGroupId: t.adGroupId, text: t.searchTerm, matchType: "PHRASE" },
        dedupeKey: `ADICIONAR_KEYWORD:${t.adGroupId}:${normText(t.searchTerm)}`
      });
    }
  }

  // ---- Palavras-chave ----
  for (const k of input.keywords) {
    if (!k.adGroupId || !k.text) continue;
    const cpa = k.conversions > 0 ? k.cost / k.conversions : Infinity;
    const isManual = manualCpc.has(k.campaignId);

    // R3 — PAUSAR: keyword ativa gastando sem converter.
    if (k.status === "ENABLED" && k.conversions === 0 && k.cost >= threshold && k.clicks >= 15) {
      let score = 0.55;
      if (k.cost >= 4 * threshold) score += 0.2;
      if (goal.minCtr != null && k.ctr < 0.5 * goal.minCtr) score += 0.1;
      score = round4(clamp(score, 0, 0.95));
      const confidence = confidenceFor(k.clicks, k.conversions, goal.windowDays);
      recs.push({
        actionType: "PAUSAR",
        campaignId: k.campaignId,
        campaignName: k.campaignName,
        adGroupId: k.adGroupId,
        adGroupName: k.adGroupName,
        keywordText: k.text,
        matchType: k.matchType,
        signals: { cost: round4(k.cost), clicks: k.clicks, conversions: k.conversions, ctr: round4(k.ctr) },
        score,
        confidence,
        ruleJustification: `Palavra-chave ativa gastou ${round4(k.cost)} em ${k.clicks} clique(s) sem converter.`,
        autoApplyEligible: eligible("PAUSAR", score, confidence),
        intent: {
          kind: "PAUSE_KEYWORD",
          adGroupId: k.adGroupId,
          criterionId: k.criterionId,
          text: k.text,
          matchType: k.matchType
        },
        dedupeKey: `PAUSAR:${k.adGroupId}:${normText(k.text)}`
      });
      continue; // pausar e ajustar lance são mutuamente exclusivos
    }

    // Ajustes de lance só em MANUAL_CPC e com alvo definido.
    if (!isManual || goal.target == null || k.averageCpc <= 0) continue;

    // R4 — REDUZIR_LANCE: converte, mas CPA acima do alvo.
    if (k.conversions >= 1 && cpa > 1.3 * goal.target) {
      const newBid = Math.max(k.averageCpc * 0.65, (k.averageCpc * goal.target) / cpa);
      const score = round4(clamp(0.5 + (cpa / goal.target - 1.3) * 0.2, 0, 0.85));
      const confidence = confidenceFor(k.clicks, k.conversions, goal.windowDays);
      recs.push({
        actionType: "REDUZIR_LANCE",
        campaignId: k.campaignId,
        campaignName: k.campaignName,
        adGroupId: k.adGroupId,
        adGroupName: k.adGroupName,
        keywordText: k.text,
        matchType: k.matchType,
        signals: { cpa: round4(cpa), target: round4(goal.target), averageCpc: round4(k.averageCpc), newBid: round4(newBid) },
        score,
        confidence,
        ruleJustification: `CPA ${round4(cpa)} acima do alvo ${round4(goal.target)}; reduzir lance de ${round4(k.averageCpc)} para ~${round4(newBid)}.`,
        autoApplyEligible: eligible("REDUZIR_LANCE", score, confidence),
        intent: {
          kind: "SET_BID",
          adGroupId: k.adGroupId,
          criterionId: k.criterionId,
          text: k.text,
          matchType: k.matchType,
          cpcBidMicros: toMicros(newBid),
          previousCpcBidMicros: toMicros(k.averageCpc)
        },
        dedupeKey: `REDUZIR_LANCE:${k.adGroupId}:${normText(k.text)}`
      });
      continue;
    }

    // R5 — AUMENTAR_LANCE: converte bem abaixo do alvo (espaço para escalar).
    if (k.conversions >= 2 && cpa <= 0.7 * goal.target) {
      const newBid = k.averageCpc * 1.3;
      let score = 0.5;
      if (cpa <= 0.5 * goal.target) score += 0.2;
      score = round4(clamp(score, 0, 0.85));
      const confidence = confidenceFor(k.clicks, k.conversions, goal.windowDays);
      recs.push({
        actionType: "AUMENTAR_LANCE",
        campaignId: k.campaignId,
        campaignName: k.campaignName,
        adGroupId: k.adGroupId,
        adGroupName: k.adGroupName,
        keywordText: k.text,
        matchType: k.matchType,
        signals: { cpa: round4(cpa), target: round4(goal.target), averageCpc: round4(k.averageCpc), newBid: round4(newBid) },
        score,
        confidence,
        ruleJustification: `CPA ${round4(cpa)} bem abaixo do alvo ${round4(goal.target)}; aumentar lance de ${round4(k.averageCpc)} para ~${round4(newBid)}.`,
        autoApplyEligible: eligible("AUMENTAR_LANCE", score, confidence),
        intent: {
          kind: "SET_BID",
          adGroupId: k.adGroupId,
          criterionId: k.criterionId,
          text: k.text,
          matchType: k.matchType,
          cpcBidMicros: toMicros(newBid),
          previousCpcBidMicros: toMicros(k.averageCpc)
        },
        dedupeKey: `AUMENTAR_LANCE:${k.adGroupId}:${normText(k.text)}`
      });
    }
  }

  return recs.sort((a, b) => b.score * b.confidence - a.score * a.confidence);
}

/** Elegível a auto-aplicação: alta confiança/score E ação reversível de baixo risco. */
export function eligible(action: KeywordActionType, score: number, confidence: number): boolean {
  return score >= 0.8 && confidence >= 0.7 && REVERSIBLE_LOW_RISK.has(action);
}

/** Deriva a meta do motor a partir dos campos de `ClientGoal` (strings numéricas). */
export function goalFromClientGoal(
  goal:
    | { maxCpa?: string | null; maxCpl?: string | null; minCtr?: string | null; windowDays?: number | null }
    | null
    | undefined,
  windowDays: number,
  costFloor = DEFAULT_COST_FLOOR
): KeywordEvalGoal {
  const num = (v: string | null | undefined): number | null => {
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const target = num(goal?.maxCpa) ?? num(goal?.maxCpl);
  return { target, minCtr: num(goal?.minCtr), costFloor, windowDays };
}
