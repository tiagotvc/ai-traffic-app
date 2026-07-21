import { describe, expect, it } from "vitest";

import {
  DEFAULT_COST_FLOOR,
  eligible,
  evaluateKeywords,
  goalFromClientGoal,
  type EvalKeywordRow,
  type EvalSearchTermRow,
  type KeywordEvalGoal
} from "@/lib/google-ads-keyword-eval";

const GOAL: KeywordEvalGoal = { target: 50, minCtr: 0.02, costFloor: DEFAULT_COST_FLOOR, windowDays: 30 };

function term(p: Partial<EvalSearchTermRow>): EvalSearchTermRow {
  return {
    searchTerm: "termo x",
    status: "NONE",
    triggeringKeyword: "kw",
    matchType: "BROAD",
    campaignId: "111",
    campaignName: "Camp",
    adGroupId: "222",
    adGroupName: "Grupo",
    impressions: 100,
    clicks: 10,
    cost: 0,
    conversions: 0,
    ctr: 0.1,
    averageCpc: 1,
    ...p
  };
}

function keyword(p: Partial<EvalKeywordRow>): EvalKeywordRow {
  return {
    text: "palavra",
    matchType: "PHRASE",
    status: "ENABLED",
    criterionId: "999",
    campaignId: "111",
    campaignName: "Camp",
    adGroupId: "222",
    adGroupName: "Grupo",
    impressions: 500,
    clicks: 20,
    cost: 0,
    conversions: 0,
    ctr: 0.04,
    averageCpc: 2,
    ...p
  };
}

function only(input: Parameters<typeof evaluateKeywords>[0]) {
  return evaluateKeywords(input);
}

describe("evaluateKeywords — NEGATIVAR (termos)", () => {
  it("negativa termo que gasta acima de 2×alvo sem converter", () => {
    const recs = only({ searchTerms: [term({ cost: 120, clicks: 30, conversions: 0 })], keywords: [], goal: GOAL });
    expect(recs).toHaveLength(1);
    expect(recs[0].actionType).toBe("NEGATIVAR");
    expect(recs[0].intent).toMatchObject({ kind: "ADD_NEGATIVE", scope: "shared", adGroupId: "222", matchType: "EXACT" });
    expect(recs[0].dedupeKey).toBe("NEGATIVAR:222:termo x");
  });

  it("não negativa abaixo do limite (max(2×alvo, piso) = 100)", () => {
    const recs = only({ searchTerms: [term({ cost: 90, conversions: 0 })], keywords: [], goal: GOAL });
    expect(recs).toHaveLength(0);
  });

  it("não negativa termo já excluído", () => {
    const recs = only({ searchTerms: [term({ cost: 200, status: "EXCLUDED" })], keywords: [], goal: GOAL });
    expect(recs.filter((r) => r.actionType === "NEGATIVAR")).toHaveLength(0);
  });

  it("sem alvo, usa o piso de custo", () => {
    const noTarget: KeywordEvalGoal = { ...GOAL, target: null };
    const recs = only({ searchTerms: [term({ cost: 40, conversions: 0 })], keywords: [], goal: noTarget });
    expect(recs).toHaveLength(1);
    expect(recs[0].actionType).toBe("NEGATIVAR");
  });

  it("alto gasto + muitos cliques ⇒ score alto e auto-aplicável", () => {
    const recs = only({ searchTerms: [term({ cost: 400, clicks: 40, conversions: 0 })], keywords: [], goal: GOAL });
    expect(recs[0].score).toBeGreaterThanOrEqual(0.9);
    expect(recs[0].confidence).toBeGreaterThanOrEqual(0.7);
    expect(recs[0].autoApplyEligible).toBe(true);
  });
});

describe("evaluateKeywords — ADICIONAR_KEYWORD (termos)", () => {
  it("promove termo que converte dentro do alvo e não é keyword", () => {
    const recs = only({
      searchTerms: [term({ cost: 40, clicks: 8, conversions: 2, status: "NONE" })],
      keywords: [],
      goal: GOAL
    });
    const add = recs.find((r) => r.actionType === "ADICIONAR_KEYWORD");
    expect(add).toBeDefined();
    expect(add!.intent).toMatchObject({ kind: "ADD_KEYWORD", adGroupId: "222", matchType: "PHRASE" });
  });

  it("não promove termo já adicionado como keyword", () => {
    const recs = only({
      searchTerms: [term({ cost: 40, clicks: 8, conversions: 2, status: "ADDED" })],
      keywords: [],
      goal: GOAL
    });
    expect(recs.filter((r) => r.actionType === "ADICIONAR_KEYWORD")).toHaveLength(0);
  });

  it("não promove termo com CPA acima do alvo", () => {
    const recs = only({
      searchTerms: [term({ cost: 120, clicks: 8, conversions: 1 })], // CPA 120 > 50
      keywords: [],
      goal: GOAL
    });
    expect(recs.filter((r) => r.actionType === "ADICIONAR_KEYWORD")).toHaveLength(0);
  });

  it("promoção nunca é auto-aplicável (mesmo com score alto)", () => {
    const recs = only({
      searchTerms: [term({ cost: 20, clicks: 30, conversions: 5 })],
      keywords: [],
      goal: GOAL
    });
    const add = recs.find((r) => r.actionType === "ADICIONAR_KEYWORD")!;
    expect(add.autoApplyEligible).toBe(false);
  });
});

describe("evaluateKeywords — PAUSAR (keywords)", () => {
  it("pausa keyword ativa que gasta sem converter", () => {
    const recs = only({ searchTerms: [], keywords: [keyword({ cost: 150, clicks: 30, conversions: 0 })], goal: GOAL });
    expect(recs).toHaveLength(1);
    expect(recs[0].actionType).toBe("PAUSAR");
    expect(recs[0].intent).toMatchObject({ kind: "PAUSE_KEYWORD", criterionId: "999" });
  });

  it("não pausa com poucos cliques (<15)", () => {
    const recs = only({ searchTerms: [], keywords: [keyword({ cost: 150, clicks: 10, conversions: 0 })], goal: GOAL });
    expect(recs).toHaveLength(0);
  });

  it("não pausa keyword pausada", () => {
    const recs = only({ searchTerms: [], keywords: [keyword({ cost: 150, clicks: 30, status: "PAUSED" })], goal: GOAL });
    expect(recs).toHaveLength(0);
  });
});

describe("evaluateKeywords — lances (só MANUAL_CPC)", () => {
  it("não recomenda lance sem MANUAL_CPC", () => {
    const recs = only({
      searchTerms: [],
      keywords: [keyword({ cost: 200, clicks: 20, conversions: 2, averageCpc: 5 })], // CPA 100 > 1.3×50
      goal: GOAL
    });
    expect(recs.filter((r) => r.actionType.includes("LANCE"))).toHaveLength(0);
  });

  it("reduz lance quando CPA acima do alvo em campanha manual", () => {
    const recs = only({
      searchTerms: [],
      keywords: [keyword({ cost: 200, clicks: 20, conversions: 2, averageCpc: 5 })], // CPA 100
      goal: GOAL,
      manualCpcCampaignIds: new Set(["111"])
    });
    const bid = recs.find((r) => r.actionType === "REDUZIR_LANCE");
    expect(bid).toBeDefined();
    expect(bid!.intent.kind).toBe("SET_BID");
    if (bid!.intent.kind === "SET_BID") {
      expect(Number(bid!.intent.cpcBidMicros)).toBeLessThan(Number(bid!.intent.previousCpcBidMicros));
    }
  });

  it("aumenta lance quando CPA bem abaixo do alvo em campanha manual", () => {
    const recs = only({
      searchTerms: [],
      keywords: [keyword({ cost: 40, clicks: 20, conversions: 2, averageCpc: 2 })], // CPA 20 <= 0.7×50=35
      goal: GOAL,
      manualCpcCampaignIds: new Set(["111"])
    });
    const bid = recs.find((r) => r.actionType === "AUMENTAR_LANCE");
    expect(bid).toBeDefined();
    if (bid!.intent.kind === "SET_BID") {
      expect(Number(bid!.intent.cpcBidMicros)).toBeGreaterThan(Number(bid!.intent.previousCpcBidMicros));
    }
  });
});

describe("evaluateKeywords — ordenação e determinismo", () => {
  it("ordena por score×confiança desc", () => {
    const recs = only({
      searchTerms: [
        term({ searchTerm: "fraco", cost: 100, clicks: 3, conversions: 0 }),
        term({ searchTerm: "forte", cost: 500, clicks: 50, conversions: 0 })
      ],
      keywords: [],
      goal: GOAL
    });
    expect(recs[0].keywordText).toBe("forte");
  });

  it("mesma entrada ⇒ mesma saída (determinístico)", () => {
    const input = { searchTerms: [term({ cost: 200, clicks: 20 })], keywords: [], goal: GOAL };
    expect(evaluateKeywords(input)).toEqual(evaluateKeywords(input));
  });
});

describe("eligible / goalFromClientGoal", () => {
  it("só NEGATIVAR e PAUSAR são auto-aplicáveis", () => {
    expect(eligible("NEGATIVAR", 0.9, 0.8)).toBe(true);
    expect(eligible("PAUSAR", 0.9, 0.8)).toBe(true);
    expect(eligible("ADICIONAR_KEYWORD", 0.99, 0.99)).toBe(false);
    expect(eligible("REDUZIR_LANCE", 0.99, 0.99)).toBe(false);
    expect(eligible("NEGATIVAR", 0.79, 0.9)).toBe(false);
  });

  it("deriva target de maxCpa, senão maxCpl", () => {
    expect(goalFromClientGoal({ maxCpa: "80", maxCpl: "40" }, 30).target).toBe(80);
    expect(goalFromClientGoal({ maxCpa: null, maxCpl: "40" }, 30).target).toBe(40);
    expect(goalFromClientGoal({ maxCpa: "0", maxCpl: null }, 30).target).toBeNull();
    expect(goalFromClientGoal(null, 30).target).toBeNull();
  });
});
