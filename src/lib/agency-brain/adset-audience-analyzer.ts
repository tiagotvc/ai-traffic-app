import type { MetricKey } from "@/lib/dashboard-metrics";
import type { CampaignPresetKey } from "@/lib/campaign-presets";
import type { CampaignMetricsRow } from "@/lib/agency-brain/types";
import type { CampaignSignal } from "@/lib/agency-brain/campaign-signal-analyzer";
import { computeConfidenceScore } from "@/lib/agency-brain/confidence-score";

export type AdsetMetricsRow = {
  metaAdsetId: string;
  adsetName: string;

  spend30d: number;
  conversions30d: number;
  messages30d: number;
  roas30d: number;
  cpa30d: number | null;
  cpmsg30d: number | null;

  spend7d: number;
  conversions7d: number;
  messages7d: number;
  roas7d: number;
  cpa7d: number | null;
  cpmsg7d: number | null;
};

export type AdsetMetricsSnapshot = {
  spend: number;
  conversions: number;
  messages: number;
  roas: number;
  cpa: number | null;
  cpmsg: number | null;
};

export type AdsetPairComparison = {
  metaCampaignId: string;
  oldAdset: { id: string; name: string; baseline30d: AdsetMetricsSnapshot };
  newAdset: { id: string; name: string; current7d: AdsetMetricsSnapshot };
  deltaPercent: number;
  primaryMetric: MetricKey;
};

function primaryMetricForPreset(preset: CampaignPresetKey): MetricKey {
  switch (preset) {
    case "sales":
      return "roas";
    case "lead_whatsapp":
      return "cpmsg";
    case "lead_site":
      return "cpa";
    case "reach":
      return "frequency";
    default:
      return "cpa";
  }
}

function pctDelta(actual: number, baseline: number): number {
  if (!Number.isFinite(actual) || !Number.isFinite(baseline)) return 0;
  if (baseline === 0) return 0;
  return ((actual - baseline) / baseline) * 100;
}

function buildSnapshot(row: AdsetMetricsRow, window: "30d" | "7d"): AdsetMetricsSnapshot {
  if (window === "30d") {
    return {
      spend: row.spend30d,
      conversions: row.conversions30d,
      messages: row.messages30d,
      roas: row.roas30d,
      cpa: row.cpa30d,
      cpmsg: row.cpmsg30d
    };
  }

  return {
    spend: row.spend7d,
    conversions: row.conversions7d,
    messages: row.messages7d,
    roas: row.roas7d,
    cpa: row.cpa7d,
    cpmsg: row.cpmsg7d
  };
}

/**
 * Detecta pares "ad set antigo" vs "ad set novo" usando mudança de contribuição de spend:
 * - "novo": spend7d alto e spend do período anterior (30d - 7d) baixo
 * - "antigo": spend7d caiu vs spend do período anterior (30d - 7d)
 *
 * A função é propositalmente conservadora: retorna no máximo 1 comparação por campanha.
 */
export function detectAdsetAudienceChanges(
  metaCampaignId: string,
  adsets: AdsetMetricsRow[],
  preset: CampaignPresetKey,
  opts?: { minSpend7d?: number; minSpendOld?: number }
): AdsetPairComparison[] {
  const primaryMetric = primaryMetricForPreset(preset);
  const minSpend7d = opts?.minSpend7d ?? 150;
  const minSpendOld = opts?.minSpendOld ?? 150;

  const scored = adsets
    .map((a) => {
      const spendOld = Math.max(0, a.spend30d - a.spend7d);
      return {
        a,
        spendOld,
        spend7d: a.spend7d,
        ratioNew: spendOld > 0 ? a.spend7d / spendOld : a.spend7d > 0 ? 10 : 0
      };
    })
    .filter((s) => s.a.spend7d > 0 || s.spendOld > 0);

  if (!scored.length) return [];

  // Novo candidato: maior razão spend7d / spendOld, e spend7d mínimo.
  const newCandidate = scored
    .filter((s) => s.a.spend7d >= minSpend7d)
    .sort((x, y) => y.ratioNew - x.ratioNew)[0];
  if (!newCandidate) return [];

  // Antigo candidato: maior spendOld, e spendOld mínimo.
  const oldCandidate = scored
    .filter((s) => s.spendOld >= minSpendOld)
    .sort((x, y) => y.spendOld - x.spendOld)[0];
  if (!oldCandidate) return [];

  if (newCandidate.a.metaAdsetId === oldCandidate.a.metaAdsetId) {
    // mesma entidade não faz sentido para "troca".
    return [];
  }

  const oldRow = oldCandidate.a;
  const newRow = newCandidate.a;

  const oldSnapshot = buildSnapshot(oldRow, "30d");
  const newSnapshot = buildSnapshot(newRow, "7d");

  let oldVal: number | null = null;
  let newVal: number | null = null;
  if (primaryMetric === "cpa") {
    oldVal = oldSnapshot.cpa;
    newVal = newSnapshot.cpa;
  } else if (primaryMetric === "cpmsg") {
    oldVal = oldSnapshot.cpmsg;
    newVal = newSnapshot.cpmsg;
  } else if (primaryMetric === "roas") {
    oldVal = oldSnapshot.roas;
    newVal = newSnapshot.roas;
  } else {
    // fallback simples: compara cpa
    oldVal = oldSnapshot.cpa;
    newVal = newSnapshot.cpa;
  }

  const deltaPercent = oldVal != null && newVal != null && oldVal !== 0 ? pctDelta(newVal, oldVal) : 0;

  return [
    {
      metaCampaignId,
      oldAdset: { id: oldRow.metaAdsetId, name: oldRow.adsetName, baseline30d: oldSnapshot },
      newAdset: { id: newRow.metaAdsetId, name: newRow.adsetName, current7d: newSnapshot },
      deltaPercent,
      primaryMetric
    }
  ];
}

export function adsetComparisonsToSignals(
  comparisons: AdsetPairComparison[],
  campaignRows: CampaignMetricsRow[],
  windowDays: number
): CampaignSignal[] {
  const byCampaign = new Map(campaignRows.map((c) => [c.metaCampaignId, c]));
  const signals: CampaignSignal[] = [];

  for (const cmp of comparisons) {
    const campaign = byCampaign.get(cmp.metaCampaignId);
    if (!campaign) continue;
    if (Math.abs(cmp.deltaPercent) < 10) continue;

    const confidenceScore = computeConfidenceScore({
      conversions: campaign.conversions,
      spend: campaign.spend,
      deltaPercent: cmp.deltaPercent,
      campaignCount: campaignRows.length,
      windowDays,
      mode: "learning"
    });

    signals.push({
      type: "audience_shift",
      tier: Math.abs(cmp.deltaPercent) >= 25 ? "medium" : "weak",
      campaign,
      deltaPercent: cmp.deltaPercent,
      confidenceScore,
      priorityScore: Math.abs(cmp.deltaPercent) + confidenceScore / 10,
      baseline: {
        kind: "campaign30d",
        windowDays,
        cpa: cmp.oldAdset.baseline30d.cpa,
        ctr: null,
        roas: cmp.oldAdset.baseline30d.roas,
        spend: cmp.oldAdset.baseline30d.spend,
        conversions: cmp.oldAdset.baseline30d.conversions
      }
    });
  }

  return signals;
}

