import type { LearningConfidence } from "@/db/entities/ClientLearning";
import { confidenceBandFromScore } from "@/lib/agency-brain/domain/schemas";

export type ConfidenceScoreInput = {
  conversions: number;
  spend: number;
  deltaPercent: number;
  campaignCount?: number;
  windowDays?: number;
  /** learnings use higher ceiling; hypotheses use lower */
  mode?: "learning" | "hypothesis";
};

export function computeConfidenceScore(input: ConfidenceScoreInput): number {
  const mode = input.mode ?? "learning";
  const absDelta = Math.abs(input.deltaPercent);
  const campaigns = input.campaignCount ?? 1;

  let score = mode === "learning" ? 55 : 30;

  if (input.conversions >= 10 && input.spend >= 500) score += 25;
  else if (input.conversions >= 5 && input.spend >= 200) score += 18;
  else if (input.conversions >= 3 && input.spend >= 100) score += 12;
  else if (input.conversions >= 1) score += 5;

  if (absDelta >= 40) score += 15;
  else if (absDelta >= 25) score += 10;
  else if (absDelta >= 12) score += 6;
  else if (absDelta >= 5) score += 3;

  if (campaigns >= 3) score += 5;
  else if (campaigns >= 2) score += 3;

  const cap = mode === "learning" ? 95 : 55;
  const floor = mode === "learning" ? 40 : 20;
  return Math.min(cap, Math.max(floor, Math.round(score)));
}

export function confidenceEnumFromScore(score: number): LearningConfidence {
  return confidenceBandFromScore(score);
}

export function formatConfidenceBadge(score: number | null | undefined): string {
  if (score == null) return "—";
  return `${score}%`;
}
