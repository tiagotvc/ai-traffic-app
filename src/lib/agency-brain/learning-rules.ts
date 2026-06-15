import type {
  LearningConfidence,
  LearningImpact,
  SuggestedLearningDraft
} from "@/lib/agency-brain/types";
import type { CampaignMetricsRow } from "@/lib/agency-brain/types";

export function buildDedupeKey(
  ruleId: string,
  clientId: string,
  scope: string,
  windowDays: number
): string {
  return `rule:${ruleId}:${clientId}:${scope}:${windowDays}`;
}

export function impactFromDelta(deltaPercent: number): LearningImpact {
  const abs = Math.abs(deltaPercent);
  if (abs >= 40) return "HIGH";
  if (abs >= 20) return "MEDIUM";
  return "LOW";
}

export function confidenceFromSample(conversions: number, spend: number): LearningConfidence {
  if (conversions >= 10 && spend >= 500) return "HIGH";
  if (conversions >= 3 && spend >= 100) return "MEDIUM";
  return "LOW";
}

export function avgCpa(rows: CampaignMetricsRow[]): number | null {
  const withConv = rows.filter((r) => r.conversions > 0);
  if (!withConv.length) return null;
  const totalSpend = withConv.reduce((s, r) => s + r.spend, 0);
  const totalConv = withConv.reduce((s, r) => s + r.conversions, 0);
  return totalConv > 0 ? totalSpend / totalConv : null;
}

export function avgCtr(rows: CampaignMetricsRow[]): number | null {
  const withImp = rows.filter((r) => r.impressions > 0);
  if (!withImp.length) return null;
  const totalClicks = withImp.reduce((s, r) => s + r.clicks, 0);
  const totalImp = withImp.reduce((s, r) => s + r.impressions, 0);
  return totalImp > 0 ? (totalClicks / totalImp) * 100 : null;
}

export function avgRoas(rows: CampaignMetricsRow[]): number | null {
  const withRoas = rows.filter((r) => r.roas > 0);
  if (!withRoas.length) return null;
  return withRoas.reduce((s, r) => s + r.roas, 0) / withRoas.length;
}

export function pctDelta(actual: number, baseline: number): number {
  if (baseline === 0) return 0;
  return ((actual - baseline) / baseline) * 100;
}

export function ruleCpaWinner(
  rows: CampaignMetricsRow[],
  clientId: string,
  windowDays: number
): SuggestedLearningDraft | null {
  const baseline = avgCpa(rows);
  if (!baseline) return null;

  let best: CampaignMetricsRow | null = null;
  let bestDelta = 0;

  for (const row of rows) {
    if (!row.cpa || row.conversions < 2) continue;
    const delta = pctDelta(row.cpa, baseline);
    if (delta <= -25 && delta < bestDelta) {
      bestDelta = delta;
      best = row;
    }
  }

  if (!best) return null;

  return {
    title: `Campanha "${best.campaignName}" com CPA abaixo da média`,
    description: `CPA de R$ ${best.cpa!.toFixed(2)} está ${Math.abs(bestDelta).toFixed(0)}% abaixo da média do cliente (R$ ${baseline.toFixed(2)}). Considere escalar ou replicar a estratégia.`,
    category: "CREATIVE",
    impact: impactFromDelta(bestDelta),
    confidence: confidenceFromSample(best.conversions, best.spend),
    metaCampaignId: best.metaCampaignId,
    metricSnapshot: {
      cpa: best.cpa ?? undefined,
      spend: best.spend,
      conversions: best.conversions,
      periodDays: windowDays
    },
    evidence: {
      ruleId: "cpa_winner",
      reason: "CPA 25%+ below client average",
      deltaPercent: bestDelta,
      baselineValue: baseline,
      actualValue: best.cpa ?? undefined,
      metaCampaignId: best.metaCampaignId,
      campaignName: best.campaignName,
      comparedTo: "client_average"
    },
    dedupeKey: buildDedupeKey("cpa_winner", clientId, best.metaCampaignId, windowDays),
    tags: ["cpa", "winner"]
  };
}

export function ruleCtrWinner(
  rows: CampaignMetricsRow[],
  clientId: string,
  windowDays: number
): SuggestedLearningDraft | null {
  const baseline = avgCtr(rows);
  if (!baseline) return null;

  let best: CampaignMetricsRow | null = null;
  let bestDelta = 0;

  for (const row of rows) {
    if (row.impressions < 500) continue;
    const delta = pctDelta(row.ctr, baseline);
    if (delta >= 30 && delta > bestDelta) {
      bestDelta = delta;
      best = row;
    }
  }

  if (!best) return null;

  return {
    title: `Campanha "${best.campaignName}" com CTR acima da média`,
    description: `CTR de ${best.ctr.toFixed(2)}% está ${bestDelta.toFixed(0)}% acima da média do cliente (${baseline.toFixed(2)}%). Criativos desta campanha merecem análise.`,
    category: "CREATIVE",
    impact: impactFromDelta(bestDelta),
    confidence: confidenceFromSample(best.conversions, best.spend),
    metaCampaignId: best.metaCampaignId,
    metricSnapshot: {
      ctr: best.ctr,
      impressions: best.impressions,
      clicks: best.clicks,
      periodDays: windowDays
    },
    evidence: {
      ruleId: "ctr_winner",
      reason: "CTR 30%+ above client average",
      deltaPercent: bestDelta,
      baselineValue: baseline,
      actualValue: best.ctr,
      metaCampaignId: best.metaCampaignId,
      campaignName: best.campaignName
    },
    dedupeKey: buildDedupeKey("ctr_winner", clientId, best.metaCampaignId, windowDays),
    tags: ["ctr", "winner"]
  };
}

export function ruleAudienceCpa(
  rows: CampaignMetricsRow[],
  clientId: string,
  windowDays: number
): SuggestedLearningDraft | null {
  const baseline = avgCpa(rows);
  if (!baseline || rows.length < 2) return null;

  let best: CampaignMetricsRow | null = null;
  let bestDelta = 0;

  for (const row of rows) {
    if (!row.cpa || row.conversions < 2) continue;
    const delta = pctDelta(row.cpa, baseline);
    if (delta <= -30 && delta < bestDelta) {
      bestDelta = delta;
      best = row;
    }
  }

  if (!best) return null;

  return {
    title: `Público/campanha "${best.campaignName}" com melhor eficiência`,
    description: `CPA ${Math.abs(bestDelta).toFixed(0)}% abaixo da média — público ou segmentação desta campanha performou melhor que as demais.`,
    category: "AUDIENCE",
    impact: impactFromDelta(bestDelta),
    confidence: confidenceFromSample(best.conversions, best.spend),
    metaCampaignId: best.metaCampaignId,
    metricSnapshot: { cpa: best.cpa ?? undefined, periodDays: windowDays },
    evidence: {
      ruleId: "audience_cpa",
      reason: "Campaign CPA 30%+ below average (audience proxy)",
      deltaPercent: bestDelta,
      metaCampaignId: best.metaCampaignId,
      campaignName: best.campaignName
    },
    dedupeKey: buildDedupeKey("audience_cpa", clientId, best.metaCampaignId, windowDays),
    tags: ["audience", "cpa"]
  };
}

export function ruleSaturation(
  rows: CampaignMetricsRow[],
  clientId: string,
  windowDays: number
): SuggestedLearningDraft | null {
  for (const row of rows) {
    if (row.frequency > 3.5 && row.ctr < 1 && row.impressions > 1000) {
      return {
        title: `Possível saturação em "${row.campaignName}"`,
        description: `Frequência de ${row.frequency.toFixed(1)} com CTR baixo (${row.ctr.toFixed(2)}%). Criativos podem estar saturados — considere renovar.`,
        category: "CREATIVE",
        impact: "MEDIUM",
        confidence: row.impressions > 5000 ? "MEDIUM" : "LOW",
        metaCampaignId: row.metaCampaignId,
        metricSnapshot: {
          frequency: row.frequency,
          ctr: row.ctr,
          impressions: row.impressions,
          periodDays: windowDays
        },
        evidence: {
          ruleId: "saturation",
          reason: "Frequency > 3.5 with low CTR",
          actualValue: row.frequency,
          metaCampaignId: row.metaCampaignId,
          campaignName: row.campaignName
        },
        dedupeKey: buildDedupeKey("saturation", clientId, row.metaCampaignId, windowDays),
        tags: ["saturation", "frequency"]
      };
    }
  }
  return null;
}

export function ruleSpendNoConversion(
  rows: CampaignMetricsRow[],
  clientId: string,
  windowDays: number,
  spendThreshold = 500
): SuggestedLearningDraft | null {
  for (const row of rows) {
    if (row.spend >= spendThreshold && row.conversions === 0) {
      return {
        title: `Campanha "${row.campaignName}" com gasto sem conversões`,
        description: `R$ ${row.spend.toFixed(0)} investidos sem conversões no período. Revisar criativo, público ou oferta.`,
        category: "GENERAL",
        impact: row.spend >= spendThreshold * 2 ? "HIGH" : "MEDIUM",
        confidence: "MEDIUM",
        metaCampaignId: row.metaCampaignId,
        metricSnapshot: { spend: row.spend, conversions: 0, periodDays: windowDays },
        evidence: {
          ruleId: "spend_no_conversion",
          reason: "Significant spend without conversions",
          actualValue: row.spend,
          metaCampaignId: row.metaCampaignId,
          campaignName: row.campaignName
        },
        dedupeKey: buildDedupeKey("spend_no_conversion", clientId, row.metaCampaignId, windowDays),
        tags: ["negative", "spend"]
      };
    }
  }
  return null;
}

export function ruleRoasLift(
  current: CampaignMetricsRow[],
  previous: CampaignMetricsRow[],
  clientId: string,
  windowDays: number
): SuggestedLearningDraft | null {
  const prevMap = new Map(previous.map((r) => [r.metaCampaignId, r]));

  for (const row of current) {
    const prev = prevMap.get(row.metaCampaignId);
    if (!prev || prev.roas <= 0 || row.roas <= 0) continue;
    const delta = pctDelta(row.roas, prev.roas);
    if (delta >= 20) {
      return {
        title: `ROAS em alta em "${row.campaignName}"`,
        description: `ROAS subiu ${delta.toFixed(0)}% vs período anterior (${prev.roas.toFixed(2)} → ${row.roas.toFixed(2)}). Mudança recente pode estar funcionando.`,
        category: "CREATIVE",
        impact: impactFromDelta(delta),
        confidence: "MEDIUM",
        metaCampaignId: row.metaCampaignId,
        metricSnapshot: {
          roas: row.roas,
          periodDays: windowDays
        },
        evidence: {
          ruleId: "roas_lift",
          reason: "ROAS increased 20%+ vs prior period",
          deltaPercent: delta,
          baselineValue: prev.roas,
          actualValue: row.roas,
          metaCampaignId: row.metaCampaignId,
          campaignName: row.campaignName
        },
        dedupeKey: buildDedupeKey("roas_lift", clientId, row.metaCampaignId, windowDays),
        tags: ["roas", "lift"]
      };
    }
  }
  return null;
}

export function evaluateAllRules(
  current: CampaignMetricsRow[],
  previous: CampaignMetricsRow[],
  clientId: string,
  windowDays: number,
  spendThreshold?: number
): SuggestedLearningDraft[] {
  const rules = [
    ruleCpaWinner(current, clientId, windowDays),
    ruleCtrWinner(current, clientId, windowDays),
    ruleAudienceCpa(current, clientId, windowDays),
    ruleSaturation(current, clientId, windowDays),
    ruleSpendNoConversion(current, clientId, windowDays, spendThreshold),
    ruleRoasLift(current, previous, clientId, windowDays)
  ];
  return rules.filter((r): r is SuggestedLearningDraft => r !== null);
}
