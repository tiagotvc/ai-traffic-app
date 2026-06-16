import type { LearningCategory } from "@/db/entities/ClientLearning";
import { computeConfidenceScore, confidenceEnumFromScore } from "@/lib/agency-brain/confidence-score";
import type { CampaignMetricsRow } from "@/lib/agency-brain/types";

export type AiDraftLike = {
  title: string;
  description: string;
  category: LearningCategory;
  metaCampaignId?: string | null;
  confidenceScore?: number;
  impact?: "HIGH" | "MEDIUM" | "LOW";
  confidence?: "HIGH" | "MEDIUM" | "LOW";
  evidence?: Record<string, unknown>;
};

type BaselineMetrics = {
  cpa: number | null;
  ctr?: number;
  roas?: number;
};

export type AiValidationResult<T> =
  | { ok: true; draft: T }
  | { ok: false; reason: string };

const NUMBER_IN_TEXT = /(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:[.,]\d+)?)\s*%?/g;

function parseLooseNumber(raw: string): number | null {
  const cleaned = raw.replace(/R\$\s*/i, "").replace(/\./g, "").replace(",", ".").replace(/%$/, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function extractNumbers(text: string): number[] {
  const out: number[] = [];
  for (const match of text.matchAll(NUMBER_IN_TEXT)) {
    const n = parseLooseNumber(match[0]);
    if (n != null && n > 0) out.push(n);
  }
  return out;
}

function metricValues(row: CampaignMetricsRow): number[] {
  const vals: number[] = [row.spend, row.ctr, row.roas, row.frequency, row.conversions];
  if (row.cpa != null) vals.push(row.cpa);
  return vals.filter((v) => Number.isFinite(v) && v > 0);
}

function numbersMatchMetrics(text: string, row: CampaignMetricsRow, tolerancePct = 15): boolean {
  const cited = extractNumbers(text);
  if (!cited.length) return true;

  const metrics = metricValues(row);
  if (!metrics.length) return false;

  for (const citedNum of cited) {
    const matched = metrics.some((m) => {
      if (m === 0) return citedNum === 0;
      const diff = Math.abs((citedNum - m) / m) * 100;
      return diff <= tolerancePct;
    });
    if (!matched) return false;
  }
  return true;
}

function deltaForRow(row: CampaignMetricsRow, baseline?: BaselineMetrics): number {
  if (baseline?.cpa != null && row.cpa != null && baseline.cpa !== 0) {
    return ((row.cpa - baseline.cpa) / baseline.cpa) * 100;
  }
  if (row.cpaDeltaPct != null) return row.cpaDeltaPct;
  if (row.ctrDeltaPct != null) return row.ctrDeltaPct;
  if (row.roasDeltaPct != null) return row.roasDeltaPct;
  return 0;
}

export function validateAiLearningDraft(
  draft: AiDraftLike,
  campaigns: CampaignMetricsRow[],
  baselineByCampaign?: Map<string, BaselineMetrics>
): AiValidationResult<AiDraftLike> {
  if (!draft.metaCampaignId) {
    return { ok: true, draft };
  }

  const row = campaigns.find((c) => c.metaCampaignId === draft.metaCampaignId);
  if (!row) {
    return { ok: false, reason: "metaCampaignId inexistente" };
  }

  const text = `${draft.title} ${draft.description}`;
  if (!numbersMatchMetrics(text, row)) {
    return { ok: false, reason: "números divergem das métricas reais" };
  }

  const baseline = baselineByCampaign?.get(draft.metaCampaignId);
  const deltaPercent = deltaForRow(row, baseline);
  const confidenceScore = computeConfidenceScore({
    conversions: row.conversions,
    spend: row.spend,
    deltaPercent,
    campaignCount: campaigns.length,
    windowDays: 7,
    mode: "learning"
  });

  return {
    ok: true,
    draft: {
      ...draft,
      confidenceScore,
      confidence: confidenceEnumFromScore(confidenceScore),
      evidence: {
        ...draft.evidence,
        deltaPercent,
        validatedAt: new Date().toISOString()
      }
    }
  };
}

export function validateAiHypothesisDraft(
  draft: AiDraftLike,
  campaigns: CampaignMetricsRow[],
  baselineByCampaign?: Map<string, BaselineMetrics>
): AiValidationResult<AiDraftLike> {
  const base = validateAiLearningDraft(draft, campaigns, baselineByCampaign);
  if (!base.ok) return base;

  const row = draft.metaCampaignId
    ? campaigns.find((c) => c.metaCampaignId === draft.metaCampaignId)
    : undefined;
  const baseline = draft.metaCampaignId ? baselineByCampaign?.get(draft.metaCampaignId) : undefined;
  const deltaPercent = row ? deltaForRow(row, baseline) : 0;

  const confidenceScore = computeConfidenceScore({
    conversions: row?.conversions ?? 0,
    spend: row?.spend ?? 0,
    deltaPercent,
    campaignCount: campaigns.length,
    windowDays: 7,
    mode: "hypothesis"
  });

  return {
    ok: true,
    draft: {
      ...base.draft,
      confidenceScore: Math.min(confidenceScore, 55)
    }
  };
}

export function validateAiActionDraft(
  draft: AiDraftLike & { actionType?: string },
  campaigns: CampaignMetricsRow[],
  baselineByCampaign?: Map<string, BaselineMetrics>
): AiValidationResult<AiDraftLike> {
  return validateAiLearningDraft(draft, campaigns, baselineByCampaign);
}
