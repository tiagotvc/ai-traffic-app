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

    const effectiveCpa = base30?.cpa ?? null;
    const effectiveCtr = base30?.ctr ?? null;
    const effectiveRoas = base30?.roas ?? null;

    const baselineSpend = base30?.spend ?? prev?.spend ?? 0;
    const baselineConversions = base30?.conversions ?? prev?.conversions ?? 0;

    const baselineKind: CampaignSignal["baseline"]["kind"] = base30 ? "campaign30d" : "previousWindow";

    const baseline = {
      kind: baselineKind,
      windowDays,
      cpa: base30 ? effectiveCpa : prevCpa,
      ctr: base30 ? effectiveCtr : prevCtr,
      roas: base30 ? effectiveRoas : prevRoas,
      spend: baselineSpend,
      conversions: baselineConversions
    };

    const cpaDelta = effectiveCpa != null && campaign.cpa != null ? pctDelta(campaign.cpa, effectiveCpa) : campaign.cpaDeltaPct ?? 0;
    const ctrDelta = effectiveCtr != null ? pctDelta(campaign.ctr, effectiveCtr) : campaign.ctrDeltaPct ?? 0;
    const roasDelta = effectiveRoas != null ? pctDelta(campaign.roas, effectiveRoas) : campaign.roasDeltaPct ?? 0;

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

    // CPA eficiente (menor é melhor)
    if (campaign.cpa != null && campaign.conversions >= 3) {
      if (cpaDelta <= thresholds.cpaStrongPct) {
        pushSignal("cpa_efficient", "strong", cpaDelta);
      } else if (cpaDelta <= thresholds.cpaWeakPct) {
        pushSignal("cpa_efficient", "medium", cpaDelta);
      }
    }

    // CTR forte
    if (campaign.impressions >= 300 && ctrDelta >= thresholds.ctrWeakPct) {
      if (ctrDelta >= thresholds.ctrStrongPct) pushSignal("ctr_strong", "strong", ctrDelta);
      else pushSignal("ctr_strong", "medium", ctrDelta);
    }

    // ROAS em alta
    if (roasDelta >= thresholds.roasLiftWeakPct && campaign.spend >= spendThreshold * 0.3) {
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

  // Ordena por prioridade.
  return signals.sort((a, b) => b.priorityScore - a.priorityScore);
}

