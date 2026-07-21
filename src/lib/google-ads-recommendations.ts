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
  const goal = goalFromClientGoal(goalRow, daysBetween(range.since, range.until));

  // MANUAL_CPC ainda não é resolvido no M2a — recs de lance só entram quando a
  // orquestração passar as campanhas manuais (M2b). Set vazio = sem recs de lance.
  const fresh = evaluateKeywords({ keywords, searchTerms, goal, manualCpcCampaignIds: new Set() });

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
  row.source = "rule";
  row.intent = rec.intent;
  row.ruleJustification = rec.ruleJustification;
  row.autoApplyEligible = rec.autoApplyEligible;
  row.status = "PENDING";
  row.dedupeKey = rec.dedupeKey;
}
