import type { ActionSuggestionPriority } from "@/db/entities/ClientActionSuggestion";
import type { CampaignSignal } from "@/lib/agency-brain/campaign-signal-analyzer";

export function computePriorityScore(input: {
  deltaPercent: number;
  spend: number;
  totalSpend: number;
  confidenceScore: number;
}): number {
  const impactWeight = 1;
  const urgencyWeight = 0.5;
  const absDelta = Math.abs(input.deltaPercent);
  const spendRatio = input.totalSpend > 0 ? input.spend / input.totalSpend : 0;
  return impactWeight * absDelta + urgencyWeight * spendRatio * 100 + input.confidenceScore / 10;
}

export function priorityFromScore(score: number): ActionSuggestionPriority {
  if (score >= 50) return "HIGH";
  if (score >= 25) return "MEDIUM";
  return "LOW";
}

export function priorityFromSignal(signal: CampaignSignal, totalSpend: number): ActionSuggestionPriority {
  const score = computePriorityScore({
    deltaPercent: signal.deltaPercent,
    spend: signal.campaign.spend,
    totalSpend,
    confidenceScore: signal.confidenceScore
  });
  return priorityFromScore(score);
}
