import type { LearningCategory } from "@/db/entities/ClientLearning";
import {
  computeConfidenceScore,
  confidenceEnumFromScore
} from "@/lib/agency-brain/confidence-score";
import {
  avgCpa,
  avgCtr,
  buildDedupeKey,
  impactFromDelta,
  pctDelta
} from "@/lib/agency-brain/learning-rules";
import type { CampaignMetricsRow } from "@/lib/agency-brain/types";

export type SuggestedHypothesisDraft = {
  title: string;
  description: string;
  category: LearningCategory;
  confidenceScore: number;
  metaCampaignId?: string | null;
  metricSnapshot?: Record<string, unknown>;
  evidence: Record<string, unknown>;
  dedupeKey: string;
  tags?: string[];
};

function hypothesisDedupeKey(ruleId: string, clientId: string, scope: string, windowDays: number) {
  return `hypothesis:${buildDedupeKey(ruleId, clientId, scope, windowDays)}`;
}

function enrichHypothesis(
  draft: Omit<SuggestedHypothesisDraft, "confidenceScore"> & { confidenceScore?: number },
  row?: CampaignMetricsRow,
  campaignCount?: number,
  windowDays?: number
): SuggestedHypothesisDraft {
  const deltaPercent = Number(draft.evidence.deltaPercent ?? 0);
  const conversions = row?.conversions ?? Number(draft.metricSnapshot?.conversions ?? 0);
  const spend = row?.spend ?? Number(draft.metricSnapshot?.spend ?? 0);

  const confidenceScore =
    draft.confidenceScore ??
    computeConfidenceScore({
      conversions,
      spend,
      deltaPercent,
      campaignCount,
      windowDays,
      mode: "hypothesis"
    });

  return { ...draft, confidenceScore };
}

export function ruleHypothesisCpaTrend(
  rows: CampaignMetricsRow[],
  clientId: string,
  windowDays: number
): SuggestedHypothesisDraft | null {
  const baseline = avgCpa(rows);
  if (!baseline) return null;

  let best: CampaignMetricsRow | null = null;
  let bestDelta = 0;

  for (const row of rows) {
    if (!row.cpa || row.conversions < 1) continue;
    const delta = pctDelta(row.cpa, baseline);
    if (delta <= -12 && delta < bestDelta) {
      bestDelta = delta;
      best = row;
    }
  }

  if (!best) return null;

  return enrichHypothesis(
    {
      title: `Hipótese: "${best.campaignName}" pode ter CPA eficiente`,
      description: `CPA ${Math.abs(bestDelta).toFixed(0)}% abaixo da média (R$ ${best.cpa!.toFixed(2)} vs R$ ${baseline.toFixed(2)}). Padrão fraco — validar com mais dados antes de escalar.`,
      category: "CREATIVE",
      metaCampaignId: best.metaCampaignId,
      metricSnapshot: {
        cpa: best.cpa,
        spend: best.spend,
        conversions: best.conversions,
        periodDays: windowDays
      },
      evidence: {
        ruleId: "hypothesis_cpa_trend",
        reason: "CPA 12%+ below client average (weak signal)",
        deltaPercent: bestDelta,
        baselineValue: baseline,
        actualValue: best.cpa,
        metaCampaignId: best.metaCampaignId,
        campaignName: best.campaignName
      },
      dedupeKey: hypothesisDedupeKey("cpa_trend", clientId, best.metaCampaignId, windowDays),
      tags: ["hypothesis", "cpa"]
    },
    best,
    rows.length,
    windowDays
  );
}

export function ruleHypothesisCtrTrend(
  rows: CampaignMetricsRow[],
  clientId: string,
  windowDays: number
): SuggestedHypothesisDraft | null {
  const baseline = avgCtr(rows);
  if (!baseline) return null;

  let best: CampaignMetricsRow | null = null;
  let bestDelta = 0;

  for (const row of rows) {
    if (row.impressions < 300) continue;
    const delta = pctDelta(row.ctr, baseline);
    if (delta >= 15 && delta > bestDelta) {
      bestDelta = delta;
      best = row;
    }
  }

  if (!best) return null;

  return enrichHypothesis(
    {
      title: `Hipótese: criativos de "${best.campaignName}" atraem mais cliques`,
      description: `CTR ${bestDelta.toFixed(0)}% acima da média (${best.ctr.toFixed(2)}% vs ${baseline.toFixed(2)}%). Sinal inicial — confirmar conversão antes de replicar.`,
      category: "CREATIVE",
      metaCampaignId: best.metaCampaignId,
      metricSnapshot: {
        ctr: best.ctr,
        impressions: best.impressions,
        periodDays: windowDays
      },
      evidence: {
        ruleId: "hypothesis_ctr_trend",
        reason: "CTR 15%+ above client average (weak signal)",
        deltaPercent: bestDelta,
        baselineValue: baseline,
        actualValue: best.ctr,
        metaCampaignId: best.metaCampaignId,
        campaignName: best.campaignName
      },
      dedupeKey: hypothesisDedupeKey("ctr_trend", clientId, best.metaCampaignId, windowDays),
      tags: ["hypothesis", "ctr"]
    },
    best,
    rows.length,
    windowDays
  );
}

export function ruleHypothesisEarlySaturation(
  rows: CampaignMetricsRow[],
  clientId: string,
  windowDays: number
): SuggestedHypothesisDraft[] {
  const drafts: SuggestedHypothesisDraft[] = [];

  for (const row of rows) {
    if (row.frequency > 2.5 && row.ctr < 1.5 && row.impressions > 500) {
      drafts.push(
        enrichHypothesis(
          {
            title: `Hipótese: saturação inicial em "${row.campaignName}"`,
            description: `Frequência ${row.frequency.toFixed(1)} com CTR ${row.ctr.toFixed(2)}%. Pode indicar fadiga de criativo — monitorar nos próximos dias.`,
            category: "CREATIVE",
            metaCampaignId: row.metaCampaignId,
            metricSnapshot: {
              frequency: row.frequency,
              ctr: row.ctr,
              impressions: row.impressions,
              periodDays: windowDays
            },
            evidence: {
              ruleId: "hypothesis_saturation",
              reason: "Frequency > 2.5 with moderate CTR drop",
              actualValue: row.frequency,
              metaCampaignId: row.metaCampaignId,
              campaignName: row.campaignName
            },
            dedupeKey: hypothesisDedupeKey("saturation", clientId, row.metaCampaignId, windowDays),
            tags: ["hypothesis", "saturation"]
          },
          row,
          rows.length,
          windowDays
        )
      );
    }
  }

  return drafts.slice(0, 3);
}

export function ruleHypothesisSpendWarning(
  rows: CampaignMetricsRow[],
  clientId: string,
  windowDays: number,
  spendThreshold = 250
): SuggestedHypothesisDraft[] {
  const drafts: SuggestedHypothesisDraft[] = [];

  for (const row of rows) {
    if (row.spend >= spendThreshold && row.conversions === 0) {
      drafts.push(
        enrichHypothesis(
          {
            title: `Hipótese: "${row.campaignName}" pode precisar de ajuste`,
            description: `R$ ${row.spend.toFixed(0)} gastos sem conversões. Sinal fraco — pode ser variância ou problema real.`,
            category: "GENERAL",
            metaCampaignId: row.metaCampaignId,
            metricSnapshot: { spend: row.spend, conversions: 0, periodDays: windowDays },
            evidence: {
              ruleId: "hypothesis_spend_warning",
              reason: "Moderate spend without conversions",
              actualValue: row.spend,
              metaCampaignId: row.metaCampaignId,
              campaignName: row.campaignName
            },
            dedupeKey: hypothesisDedupeKey("spend_warning", clientId, row.metaCampaignId, windowDays),
            tags: ["hypothesis", "negative"]
          },
          row,
          rows.length,
          windowDays
        )
      );
    }
  }

  return drafts.slice(0, 3);
}

export function ruleHypothesisRoasLift(
  current: CampaignMetricsRow[],
  previous: CampaignMetricsRow[],
  clientId: string,
  windowDays: number
): SuggestedHypothesisDraft[] {
  const prevMap = new Map(previous.map((r) => [r.metaCampaignId, r]));
  const drafts: SuggestedHypothesisDraft[] = [];

  for (const row of current) {
    const prev = prevMap.get(row.metaCampaignId);
    if (!prev || prev.roas <= 0 || row.roas <= 0) continue;
    const delta = pctDelta(row.roas, prev.roas);
    if (delta >= 10) {
      drafts.push(
        enrichHypothesis(
          {
            title: `Hipótese: ROAS subindo em "${row.campaignName}"`,
            description: `ROAS +${delta.toFixed(0)}% vs período anterior. Mudança recente pode estar surtindo efeito — confirmar tendência.`,
            category: "CREATIVE",
            metaCampaignId: row.metaCampaignId,
            metricSnapshot: { roas: row.roas, periodDays: windowDays },
            evidence: {
              ruleId: "hypothesis_roas_lift",
              reason: "ROAS increased 10%+ vs prior period",
              deltaPercent: delta,
              baselineValue: prev.roas,
              actualValue: row.roas,
              metaCampaignId: row.metaCampaignId,
              campaignName: row.campaignName
            },
            dedupeKey: hypothesisDedupeKey("roas_lift", clientId, row.metaCampaignId, windowDays),
            tags: ["hypothesis", "roas"]
          },
          row,
          current.length,
          windowDays
        )
      );
    }
  }

  return drafts.slice(0, 3);
}

export function evaluateHypothesisRules(
  current: CampaignMetricsRow[],
  previous: CampaignMetricsRow[],
  clientId: string,
  windowDays: number,
  spendThreshold?: number
): SuggestedHypothesisDraft[] {
  const threshold = spendThreshold != null ? Math.round(spendThreshold * 0.5) : 250;
  const singles: SuggestedHypothesisDraft[] = [];

  const cpa = ruleHypothesisCpaTrend(current, clientId, windowDays);
  const ctr = ruleHypothesisCtrTrend(current, clientId, windowDays);
  const used = new Set<string>();

  if (cpa) {
    singles.push(cpa);
    used.add(cpa.metaCampaignId ?? "");
  }
  if (ctr && !used.has(ctr.metaCampaignId ?? "")) {
    singles.push(ctr);
  }

  const multi = [
    ...ruleHypothesisEarlySaturation(current, clientId, windowDays),
    ...ruleHypothesisSpendWarning(current, clientId, windowDays, threshold),
    ...ruleHypothesisRoasLift(current, previous, clientId, windowDays)
  ];

  const seen = new Set(singles.map((d) => d.dedupeKey));
  for (const draft of multi) {
    if (!seen.has(draft.dedupeKey)) {
      seen.add(draft.dedupeKey);
      singles.push(draft);
    }
  }

  return singles;
}

export function confidenceBandFromHypothesisScore(score: number) {
  return confidenceEnumFromScore(score);
}
