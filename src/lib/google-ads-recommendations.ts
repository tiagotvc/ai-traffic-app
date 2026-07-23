import "server-only";

import { getWorkspaceGoogleAccessToken } from "@/lib/google-auth-store";
import { getKeywords, getSearchTerms } from "@/lib/google-ads-api";
import {
  evaluateKeywords,
  goalFromClientGoal,
  type EvalKeywordRow,
  type EvalSearchTermRow,
  type KeywordRecommendation
} from "@/lib/google-ads-keyword-eval";
import {
  classifyKeywordRelevance,
  classifySearchTermIntent,
  type RejectedExample
} from "@/lib/google-ads-keyword-ai";
import { repositories } from "@/db/repositories";
import type { GoogleKeywordRecommendation } from "@/db/entities/GoogleKeywordRecommendation";

/** Estados terminais/decididos: nunca são ressuscitados nem sobrescritos por um recompute. */
const DECIDED = new Set(["DISMISSED", "APPLIED", "AUTO_APPLIED"]);

export type RecomputeResult =
  | { ok: true; customerId: string; created: number; updated: number; removed: number; total: number }
  | { ok: false; error: "not_linked" | "not_connected" | "api_error"; message?: string };

function daysBetween(since: string, until: string): number {
  const a = Date.parse(`${since}T00:00:00Z`);
  const b = Date.parse(`${until}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 30;
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
}

/**
 * Recalcula as recomendações de palavras-chave de um cliente: lê keyword_view +
 * search_term_view, aplica o motor determinístico e faz upsert idempotente na
 * fila (`google_keyword_recommendations`) por `dedupeKey`. Silo Google — não
 * escreve NADA no Google Ads (só lê) e não toca no Meta.
 */
export async function recomputeGoogleKeywordRecommendations(
  tenantId: string,
  clientId: string,
  range: { since: string; until: string }
): Promise<RecomputeResult> {
  const { client: clientRepo, clientGoal: goalRepo, googleKeywordRecommendation: recRepo } =
    await repositories();

  const client = await clientRepo.findOne({ where: { id: clientId, tenantId } });
  const customerId = client?.googleAdsCustomerId?.replace(/\D/g, "") ?? "";
  if (!customerId) return { ok: false, error: "not_linked" };

  const token = await getWorkspaceGoogleAccessToken(tenantId);
  if (!token) return { ok: false, error: "not_connected" };

  let keywords: EvalKeywordRow[];
  let searchTerms: EvalSearchTermRow[];
  try {
    [keywords, searchTerms] = await Promise.all([
      getKeywords(token, customerId, { range }),
      getSearchTerms(token, customerId, { range })
    ]);
  } catch (err) {
    return { ok: false, error: "api_error", message: err instanceof Error ? err.message : undefined };
  }

  const goalRow = await goalRepo.findOne({ where: { clientId } });
  const windowDays = daysBetween(range.since, range.until);
  const goal = goalFromClientGoal(goalRow, windowDays);

  // MANUAL_CPC ainda não é resolvido no M2a — recs de lance só entram quando a
  // orquestração passar as campanhas manuais (M2b). Set vazio = sem recs de lance.
  const ruleRecs = evaluateKeywords({ keywords, searchTerms, goal, manualCpcCampaignIds: new Set() });

  // Camada de INTENÇÃO por IA: pega os casos que as regras de performance não veem
  // (ex.: termo faça-você-mesmo que ainda gastou pouco). Resiliente: se a IA falhar
  // (sem chave/limite), segue só com as regras.
  // Sugestões antes rejeitadas → exemplos negativos p/ a IA aprender o padrão.
  const dismissed = await recRepo.find({
    where: { tenantId, clientId, status: "DISMISSED" },
    order: { createdAt: "DESC" },
    take: 60
  });
  const rejected: RejectedExample[] = dismissed
    .filter((r) => r.actionType === "ADICIONAR_KEYWORD" || r.actionType === "NEGATIVAR")
    .map((r) => ({
      term: r.keywordText,
      decision: r.actionType === "NEGATIVAR" ? "ADD_NEGATIVE" : "ADD_KEYWORD"
    }));

  let aiRecs: KeywordRecommendation[] = [];
  try {
    aiRecs = await buildAiRecommendations(
      { name: client?.name ?? "", niche: client?.niche },
      keywords,
      searchTerms,
      rejected
    );
  } catch (err) {
    console.warn(
      "[google-ads-recommendations] IA indisponível, seguindo só com regras:",
      err instanceof Error ? err.message : err
    );
  }

  const fresh = mergeRecommendations(ruleRecs, aiRecs);

  const existing = await recRepo.find({ where: { tenantId, clientId } });
  const byKey = new Map(existing.map((r) => [r.dedupeKey, r]));
  const freshKeys = new Set(fresh.map((r) => r.dedupeKey));

  let created = 0;
  let updated = 0;
  const toSave: GoogleKeywordRecommendation[] = [];

  for (const rec of fresh) {
    const prev = byKey.get(rec.dedupeKey);
    if (prev && DECIDED.has(prev.status)) continue; // respeita decisão do usuário / já aplicado
    const row = prev ?? recRepo.create();
    applyRec(row, rec, { tenantId, clientId, customerId });
    if (prev) updated++;
    else created++;
    toSave.push(row);
  }

  if (toSave.length) await recRepo.save(toSave, { chunk: 200 });

  // Limpa PENDING obsoletas (a situação mudou e não são mais recomendadas).
  const stale = existing.filter((r) => r.status === "PENDING" && !freshKeys.has(r.dedupeKey));
  if (stale.length) await recRepo.remove(stale);

  return {
    ok: true,
    customerId,
    created,
    updated,
    removed: stale.length,
    total: created + updated
  };
}

function applyRec(
  row: GoogleKeywordRecommendation,
  rec: KeywordRecommendation,
  ctx: { tenantId: string; clientId: string; customerId: string }
): void {
  row.tenantId = ctx.tenantId;
  row.clientId = ctx.clientId;
  row.customerId = ctx.customerId;
  row.actionType = rec.actionType;
  row.campaignId = rec.campaignId || null;
  row.campaignName = rec.campaignName || null;
  row.adGroupId = rec.adGroupId || null;
  row.adGroupName = rec.adGroupName || null;
  row.criterionId = "criterionId" in rec.intent ? rec.intent.criterionId ?? null : null;
  row.keywordText = rec.keywordText;
  row.matchType = rec.matchType || null;
  row.signals = rec.signals;
  row.score = rec.score.toFixed(4);
  row.confidence = rec.confidence.toFixed(4);
  row.source = rec.source ?? "rule";
  row.intent = rec.intent;
  row.ruleJustification = rec.ruleJustification;
  row.aiJustification = rec.aiJustification ?? null;
  row.autoApplyEligible = rec.autoApplyEligible;
  row.status = "PENDING";
  row.dedupeKey = rec.dedupeKey;
}

const normTerm = (s: string): string => s.trim().toLowerCase();
const round2 = (v: number): number => Math.round(v * 100) / 100;

/**
 * Une recomendações determinísticas (performance) com as da IA (intenção). As regras
 * têm prioridade: a IA só ADICIONA recomendações para pares (grupo, termo) que as
 * regras não cobriram — evita conflito e duplicação. Reordena por prioridade.
 */
function mergeRecommendations(
  ruleRecs: KeywordRecommendation[],
  aiRecs: KeywordRecommendation[]
): KeywordRecommendation[] {
  const keys = new Set(ruleRecs.map((r) => r.dedupeKey));
  const merged = [...ruleRecs];
  for (const r of aiRecs) {
    if (keys.has(r.dedupeKey)) continue;
    keys.add(r.dedupeKey);
    merged.push(r);
  }
  return merged.sort((a, b) => b.score * b.confidence - a.score * a.confidence);
}

/**
 * Classifica a intenção dos termos de pesquisa via IA e converte em recomendações
 * ADICIONAR_KEYWORD (intenção de compra) / NEGATIVAR (sem intenção). Uma decisão por
 * termo é aplicada a cada grupo em que o termo apareceu. `source = "ai_refined"`,
 * nunca auto-aplicável (revisão humana). Lança em falha (o chamador trata).
 */
async function buildAiRecommendations(
  client: { name: string; niche?: string | null },
  keywords: EvalKeywordRow[],
  searchTerms: EvalSearchTermRow[],
  rejected: RejectedExample[]
): Promise<KeywordRecommendation[]> {
  // Termos únicos com métricas agregadas (a intenção é por texto, não por grupo).
  const byTerm = new Map<string, { term: string; clicks: number; cost: number; conversions: number }>();
  for (const t of searchTerms) {
    if (!t.searchTerm || !t.adGroupId) continue;
    const key = normTerm(t.searchTerm);
    const agg = byTerm.get(key) ?? { term: t.searchTerm, clicks: 0, cost: 0, conversions: 0 };
    agg.clicks += t.clicks;
    agg.cost += t.cost;
    agg.conversions += t.conversions;
    byTerm.set(key, agg);
  }
  const terms = [...byTerm.values()].sort((a, b) => b.cost - a.cost);
  const clientName = client.name || "anunciante";
  const kwTexts = [
    ...new Set(keywords.filter((k) => k.status === "ENABLED" && k.text).map((k) => k.text))
  ];
  // Termos que o anunciante já excluiu → exemplos p/ a IA aprender o padrão (concorrentes/fora de escopo).
  const negatedExamples = [
    ...new Set(
      searchTerms
        .filter((t) => (t.status === "EXCLUDED" || t.status === "ADDED_EXCLUDED") && t.searchTerm)
        .map((t) => t.searchTerm)
    )
  ];

  const recs: KeywordRecommendation[] = [];

  // --- Termos de pesquisa → ADICIONAR_KEYWORD / NEGATIVAR (por intenção de compra). ---
  if (terms.length > 0) {
    try {
      const decisions = await classifySearchTermIntent({
        clientName,
        niche: client.niche,
        keywords: kwTexts,
        terms,
        rejected,
        negatedExamples
      });
      const byDecision = new Map(decisions.map((d) => [normTerm(d.term), d]));
      for (const t of searchTerms) {
        if (!t.searchTerm || !t.adGroupId) continue;
        const d = byDecision.get(normTerm(t.searchTerm));
        if (!d || d.decision === "IGNORE") continue;

        const alreadyKeyword = t.status === "ADDED" || t.status === "ADDED_EXCLUDED";
        const alreadyExcluded = t.status === "EXCLUDED" || t.status === "ADDED_EXCLUDED";
        const conf = Math.max(0, Math.min(1, d.confidence));
        const base = {
          campaignId: t.campaignId,
          campaignName: t.campaignName,
          adGroupId: t.adGroupId,
          adGroupName: t.adGroupName,
          keywordText: t.searchTerm,
          matchType: d.matchType,
          score: conf,
          confidence: conf,
          ruleJustification: d.reason,
          autoApplyEligible: false,
          source: "ai_refined" as const,
          aiJustification: d.reason
        };

        if (d.decision === "ADD_KEYWORD" && !alreadyKeyword) {
          recs.push({
            ...base,
            actionType: "ADICIONAR_KEYWORD",
            signals: { intent: "compra", aiConfidence: conf, clicks: t.clicks, cost: round2(t.cost), conversions: t.conversions },
            intent: { kind: "ADD_KEYWORD", adGroupId: t.adGroupId, text: t.searchTerm, matchType: d.matchType },
            dedupeKey: `ADICIONAR_KEYWORD:${t.adGroupId}:${normTerm(t.searchTerm)}`
          });
        } else if (d.decision === "ADD_NEGATIVE" && !alreadyExcluded) {
          recs.push({
            ...base,
            actionType: "NEGATIVAR",
            signals: { intent: "sem_compra", aiConfidence: conf, clicks: t.clicks, cost: round2(t.cost), conversions: t.conversions },
            intent: {
              kind: "ADD_NEGATIVE",
              scope: "shared",
              campaignId: t.campaignId,
              adGroupId: t.adGroupId,
              text: t.searchTerm,
              matchType: d.matchType
            },
            dedupeKey: `NEGATIVAR:${t.adGroupId}:${normTerm(t.searchTerm)}`
          });
        }
      }
    } catch (err) {
      console.warn(
        "[google-ads-recommendations] IA (termos) indisponível:",
        err instanceof Error ? err.message : err
      );
    }
  }

  // --- Palavras-chave ativas FORA de contexto → PAUSAR (ex.: marca de terceiro). ---
  const enabledKws = keywords.filter((k) => k.status === "ENABLED" && k.text && k.adGroupId);
  const uniqueEnabled = [...new Set(enabledKws.map((k) => k.text))].slice(0, 60);
  if (uniqueEnabled.length > 0) {
    try {
      const relevance = await classifyKeywordRelevance({
        clientName,
        niche: client.niche,
        keywords: uniqueEnabled
      });
      const irrelevant = new Map(
        relevance.filter((r) => !r.relevant).map((r) => [normTerm(r.text), r])
      );
      for (const k of enabledKws) {
        const r = irrelevant.get(normTerm(k.text));
        if (!r) continue;
        const conf = Math.max(0, Math.min(1, r.confidence));
        recs.push({
          actionType: "PAUSAR",
          campaignId: k.campaignId,
          campaignName: k.campaignName,
          adGroupId: k.adGroupId,
          adGroupName: k.adGroupName,
          keywordText: k.text,
          matchType: k.matchType,
          signals: { intent: "fora_escopo", aiConfidence: conf },
          score: conf,
          confidence: conf,
          ruleJustification: r.reason,
          autoApplyEligible: false,
          intent: {
            kind: "PAUSE_KEYWORD",
            adGroupId: k.adGroupId,
            criterionId: k.criterionId,
            text: k.text,
            matchType: k.matchType
          },
          dedupeKey: `PAUSAR:${k.adGroupId}:${normTerm(k.text)}`,
          source: "ai_refined",
          aiJustification: r.reason
        });
      }
    } catch (err) {
      console.warn(
        "[google-ads-recommendations] IA (relevância) indisponível:",
        err instanceof Error ? err.message : err
      );
    }
  }

  return recs;
}
