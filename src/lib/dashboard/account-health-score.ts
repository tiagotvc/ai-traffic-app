import type { MetricKey } from "@/lib/dashboard-metrics";
import { pctDelta } from "@/lib/dashboard-ranges";

type Summary = Partial<Record<MetricKey, number>>;

export type AccountHealthScore = {
  score: number;
  breakdown: Record<string, { score: number; weight: number }>;
  trend: "up" | "down" | "neutral";
};

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function metricScore(key: MetricKey, cur: number, prev?: number): number {
  if (prev == null || prev <= 0) return cur > 0 ? 60 : 40;
  const delta = pctDelta(cur, prev);
  if (delta == null) return 50;
  const costMetrics: MetricKey[] = ["spend", "cpc", "cpm", "cpa", "cpmsg"];
  const goodUp = !costMetrics.includes(key);
  const improved = goodUp ? delta >= 0 : delta <= 0;
  const magnitude = Math.min(40, Math.abs(delta));
  return clamp(50 + (improved ? magnitude : -magnitude));
}

export function computeAccountHealthScore(
  summary: Summary,
  prevSummary: Summary | null,
  extras: { alertCount?: number; learningsCount?: number } = {}
): AccountHealthScore {
  const weights = {
    ctr: 0.15,
    cpa: 0.2,
    roas: 0.2,
    frequency: 0.1,
    conversions: 0.15,
    alerts: 0.1,
    learnings: 0.1
  };

  const breakdown: AccountHealthScore["breakdown"] = {};
  let total = 0;
  let weightSum = 0;

  for (const key of ["ctr", "cpa", "roas", "frequency", "conversions"] as MetricKey[]) {
    const w = weights[key as keyof typeof weights] ?? 0.1;
    const score = metricScore(key, summary[key] ?? 0, prevSummary?.[key]);
    breakdown[key] = { score, weight: w };
    total += score * w;
    weightSum += w;
  }

  const alertScore = clamp(100 - (extras.alertCount ?? 0) * 12);
  breakdown.alerts = { score: alertScore, weight: weights.alerts };
  total += alertScore * weights.alerts;
  weightSum += weights.alerts;

  const learningScore = clamp(40 + Math.min(60, (extras.learningsCount ?? 0) * 8));
  breakdown.learnings = { score: learningScore, weight: weights.learnings };
  total += learningScore * weights.learnings;
  weightSum += weights.learnings;

  const score = clamp(total / Math.max(weightSum, 0.01));
  const prevRoas = prevSummary?.roas;
  const curRoas = summary.roas ?? 0;
  const trend =
    prevRoas == null ? "neutral" : curRoas > prevRoas ? "up" : curRoas < prevRoas ? "down" : "neutral";

  return { score, breakdown, trend };
}

export type AgencyBrainScore = {
  score: number;
  learningsCount: number;
  hypothesesCount: number;
  opportunitiesCount: number;
};

export function computeAgencyBrainScore(input: {
  learnings: number;
  hypotheses: number;
  highImpactLearnings: number;
  pendingSuggestions: number;
}): AgencyBrainScore {
  const learningsCount = input.learnings;
  const hypothesesCount = input.hypotheses;
  const opportunitiesCount = input.highImpactLearnings + input.pendingSuggestions;

  const raw =
    Math.min(40, learningsCount * 8) +
    Math.min(30, hypothesesCount * 6) +
    Math.min(30, opportunitiesCount * 5);

  return {
    score: clamp(raw),
    learningsCount,
    hypothesesCount,
    opportunitiesCount
  };
}
