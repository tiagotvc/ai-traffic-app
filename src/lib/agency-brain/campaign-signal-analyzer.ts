import type { ClientGoal } from "@/db/entities/ClientGoal";

import { computeConfidenceScore } from "@/lib/agency-brain/confidence-score";
import type { BaselineMetrics } from "@/lib/agency-brain/metrics-input";
import type { CampaignMetricsRow } from "@/lib/agency-brain/types";
import { getClientAdaptiveThresholds } from "@/lib/agency-brain/adaptive-thresholds";

export type SignalType =
  | "cpa_efficient"
  | "ctr_strong"
  | "saturation"
  | "spend_waste"
  | "roas_lift"
  | "budget_concentration"
  | "audience_shift"
  | "spike_cpa"
  | "spike_ctr"
  | "spike_roas";

export type SignalTier = "weak" | "medium" | "strong";

export type CampaignSignal = {
  type: SignalType;
  tier: SignalTier;
  campaign: CampaignMetricsRow;
  deltaPercent: number;
  confidenceScore: number;
  priorityScore: number;
  baseline: {
    kind: "previousWindow" | "campaign30d";
    windowDays: number;
    cpa: number | null;
    ctr: number | null;
    roas: number | null;
    spend: number;
    conversions: number;
  };
};

function absPct(n: number) {
  return Math.abs(Number.isFinite(n) ? n : 0);
}

function pctDelta(actual: number, baseline: number): number {
  if (!Number.isFinite(actual) || !Number.isFinite(baseline)) return 0;
  if (baseline === 0) return 0;
  return ((actual - baseline) / baseline) * 100;
}

/** Ignora variações insignificantes ou valores quase iguais após arredondamento. */
function isMeaningfulMetricDelta(
  actual: number | null,
  baseline: number | null,
  deltaPercent: number,
  minAbsDeltaPct = 8,
  minRelativeDiff = 0.03
): boolean {
  if (actual == null || baseline == null || baseline <= 0) return false;
  if (Math.abs(deltaPercent) < minAbsDeltaPct) return false;
  const relativeDiff = Math.abs(actual - baseline) / baseline;
  return relativeDiff >= minRelativeDiff;
}

function resolveCpaBaseline(
  prevCpa: number | null,
  baseline30Cpa: number | null
): { cpa: number | null; kind: CampaignSignal["baseline"]["kind"] } {
  if (prevCpa != null && prevCpa > 0) {
    return { cpa: prevCpa, kind: "previousWindow" };
  }
  if (baseline30Cpa != null && baseline30Cpa > 0) {
    return { cpa: baseline30Cpa, kind: "campaign30d" };
  }
  return { cpa: null, kind: "previousWindow" };
}

export function analyzeClientCampaigns(input: {
  clientId: string;
  current: CampaignMetricsRow[];
  previous: CampaignMetricsRow[];
  baseline30d?: Map<string, BaselineMetrics>;
  goal: ClientGoal | null;
  spendThreshold: number;
  windowDays: number;
}): CampaignSignal[] {
  const { current, previous, baseline30d, goal, spendThreshold, windowDays, clientId } = input;
  const weeklySpend = current.reduce((s, r) => s + r.spend, 0);
  const thresholds = getClientAdaptiveThresholds(clientId, goal, weeklySpend);

  const prevById = new Map(previous.map((p) => [p.metaCampaignId, p]));
  const totalSpend = weeklySpend;

  const signals: CampaignSignal[] = [];

  for (const campaign of current) {
    const prev = prevById.get(campaign.metaCampaignId);
    const base30 = baseline30d?.get(campaign.metaCampaignId) ?? null;

    const prevCpa = prev?.cpa ?? null;
    const prevCtr = prev?.ctr ?? null;
    const prevRoas = prev?.roas ?? null;

    const baseline30Cpa = base30?.cpa ?? null;
    const baseline30Ctr = base30?.ctr ?? null;
    const baseline30Roas = base30?.roas ?? null;

    const cpaBaseline = resolveCpaBaseline(prevCpa, baseline30Cpa);
    const ctrBaseline = prevCtr ?? baseline30Ctr;
    const roasBaseline = prevRoas ?? baseline30Roas;

    const baselineSpend = prev?.spend ?? base30?.spend ?? 0;
    const baselineConversions = prev?.conversions ?? base30?.conversions ?? 0;

    const baseline = {
      kind: cpaBaseline.kind,
      windowDays,
      cpa: cpaBaseline.cpa,
      ctr: ctrBaseline,
      roas: roasBaseline,
      spend: baselineSpend,
      conversions: baselineConversions
    };

    const cpaDelta =
      campaign.cpa != null && cpaBaseline.cpa != null
        ? pctDelta(campaign.cpa, cpaBaseline.cpa)
        : 0;
    const ctrDelta =
      ctrBaseline != null ? pctDelta(campaign.ctr, ctrBaseline) : campaign.ctrDeltaPct ?? 0;
    const roasDelta =
      roasBaseline != null ? pctDelta(campaign.roas, roasBaseline) : campaign.roasDeltaPct ?? 0;

    const spendRatio = totalSpend > 0 ? campaign.spend / totalSpend : 0;

    function pushSignal(type: SignalType, tier: SignalTier, deltaPercent: number) {
      const mode = tier === "weak" ? "hypothesis" : "learning";
      const confidenceScore = computeConfidenceScore({
        conversions: campaign.conversions,
        spend: campaign.spend,
        deltaPercent,
        campaignCount: current.length,
        windowDays,
        mode
      });

      // Fórmula simples e consistente: impacto (delta) + urgência (spendRatio) + confiança.
      const priorityScore = absPct(deltaPercent) + spendRatio * 100 + confidenceScore / 10;

      signals.push({
        type,
        tier,
        campaign,
        deltaPercent,
        confidenceScore,
        priorityScore,
        baseline
      });
    }

    // CPA eficiente (menor é melhor) — baseline e delta sempre alinhados
    if (
      campaign.cpa != null &&
      campaign.conversions >= 3 &&
      isMeaningfulMetricDelta(campaign.cpa, cpaBaseline.cpa, cpaDelta)
    ) {
      if (cpaDelta <= thresholds.cpaStrongPct) {
        pushSignal("cpa_efficient", "strong", cpaDelta);
      } else if (cpaDelta <= thresholds.cpaWeakPct) {
        pushSignal("cpa_efficient", "medium", cpaDelta);
      }
    }

    // CTR forte
    if (
      campaign.impressions >= 300 &&
      isMeaningfulMetricDelta(campaign.ctr, ctrBaseline, ctrDelta, 10, 0.05) &&
      ctrDelta >= thresholds.ctrWeakPct
    ) {
      if (ctrDelta >= thresholds.ctrStrongPct) pushSignal("ctr_strong", "strong", ctrDelta);
      else pushSignal("ctr_strong", "medium", ctrDelta);
    }

    // ROAS em alta
    if (
      roasDelta >= thresholds.roasLiftWeakPct &&
      campaign.spend >= spendThreshold * 0.3 &&
      isMeaningfulMetricDelta(campaign.roas, roasBaseline, roasDelta, 10, 0.05)
    ) {
      if (roasDelta >= thresholds.roasLiftStrongPct) pushSignal("roas_lift", "medium", roasDelta);
      else pushSignal("roas_lift", "weak", roasDelta);
    }

    // Spend sem conversões (waste)
    if (campaign.spend >= spendThreshold && campaign.conversions === 0) {
      pushSignal("spend_waste", "weak", 0);
    }

    // Saturação (freq alta + CTR baixo)
    if (campaign.impressions >= 1000 && campaign.frequency >= thresholds.frequencySaturation && campaign.ctr < 1) {
      pushSignal("saturation", "weak", 0);
    }

    // Spikes (mudanças bruscas vs período anterior)
    if (prev) {
      if (prevCpa != null && campaign.cpa != null) {
        const spikeDelta = pctDelta(campaign.cpa, prevCpa);
        if (Math.abs(spikeDelta) >= 25) pushSignal("spike_cpa", "weak", spikeDelta);
      }
      if (prevCtr != null) {
        const spikeDelta = pctDelta(campaign.ctr, prevCtr);
        if (Math.abs(spikeDelta) >= 25) pushSignal("spike_ctr", "weak", spikeDelta);
      }
      if (prevRoas != null) {
        const spikeDelta = pctDelta(campaign.roas, prevRoas);
        if (Math.abs(spikeDelta) >= 25) pushSignal("spike_roas", "weak", spikeDelta);
      }
    }
  }

  // Concentração de orçamento (top 1 campanha)
  if (current.length >= 2 && totalSpend > 0) {
    const top = [...current].sort((a, b) => b.spend - a.spend)[0];
    const ratio = top ? top.spend / totalSpend : 0;
    if (top && ratio >= 0.6) {
      const prev = prevById.get(top.metaCampaignId);
      const baseline = {
        kind: "previousWindow" as const,
        windowDays,
        cpa: prev?.cpa ?? null,
        ctr: prev?.ctr ?? null,
        roas: prev?.roas ?? null,
        spend: prev?.spend ?? 0,
        conversions: prev?.conversions ?? 0
      };

      const confidenceScore = computeConfidenceScore({
        conversions: top.conversions,
        spend: top.spend,
        deltaPercent: 0,
        campaignCount: current.length,
        windowDays,
        mode: "learning"
      });

      const priorityScore = ratio * 100 + confidenceScore / 10;

      signals.push({
        type: "budget_concentration",
        tier: "medium",
        campaign: top,
        deltaPercent: ratio * 100,
        confidenceScore,
        priorityScore,
        baseline
      });
    }
  }

  // Ordena por prioridade e mantém no máximo um sinal por campanha.
  const sorted = signals.sort((a, b) => b.priorityScore - a.priorityScore);
  const byCampaign = new Map<string, CampaignSignal>();
  for (const signal of sorted) {
    const key = signal.campaign.metaCampaignId;
    const existing = byCampaign.get(key);
    if (!existing || signal.priorityScore > existing.priorityScore) {
      byCampaign.set(key, signal);
    }
  }
  return Array.from(byCampaign.values()).sort((a, b) => b.priorityScore - a.priorityScore);
}

