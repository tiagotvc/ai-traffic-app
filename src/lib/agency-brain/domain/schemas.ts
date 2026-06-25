import type { LearningCategory } from "@/db/entities/ClientLearning";

/** Shared domain shapes — contracts for all Agency Brain modules */

export type ConfidenceBand = "LOW" | "MEDIUM" | "HIGH";

export function confidenceBandFromScore(score: number): ConfidenceBand {
  if (score >= 80) return "HIGH";
  if (score >= 50) return "MEDIUM";
  return "LOW";
}

export type DnaBucket = { works: string[]; doesntWork: string[] };

export type ClientDnaPayload = {
  audiences: DnaBucket;
  creatives: DnaBucket;
  placements: DnaBucket;
  offers: DnaBucket;
  copy: DnaBucket;
  seasonality: DnaBucket;
  summaryText: string;
  lastDerivedAt: string | null;
  manualOverrides: Record<string, unknown>;
  approvedLearningCount: number;
};

export type HypothesisStatus =
  | "SUGGESTED"
  | "TESTING"
  | "CONFIRMED"
  | "REJECTED"
  | "PROMOTED";

export type HypothesisSource = "RULE" | "AI" | "MANUAL";

export type HypothesisDto = {
  id: string;
  clientId: string;
  title: string;
  description: string;
  category: LearningCategory;
  confidenceScore: number;
  status: HypothesisStatus;
  source: HypothesisSource;
  evidence: Record<string, unknown> | null;
  promotedLearningId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SuggestionPriority = "HIGH" | "MEDIUM" | "LOW";

export type TimelineEventType =
  | "learning_approved"
  | "learning_suggested"
  | "hypothesis_promoted"
  | "hypothesis_confirmed"
  | "suggestion_executed"
  | "suggestion_created"
  | "metric_spike"
  | "sync_completed"
  | "market_scanned"
  | "competitor_compared";

export type TimelineEventDto = {
  id: string;
  clientId: string;
  type: TimelineEventType;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type ExperimentDto = {
  id: string;
  clientId: string;
  title: string;
  variantA: string;
  variantB: string;
  winner: string | null;
  metrics: Record<string, unknown> | null;
  conclusion: string | null;
  metaCampaignId: string | null;
  horizonDays: number | null;
  baselineForecast: Record<string, unknown> | null;
  actualMetrics: Record<string, unknown> | null;
  hypothesisId: string | null;
  createdAt: string;
};

export type ActionPlanItemStatus = "pending" | "done" | "skipped";

export type ActionPlanItemDto = {
  id: string;
  title: string;
  status: ActionPlanItemStatus;
  dueDate: string | null;
  suggestionId: string | null;
};

export type ActionPlanDto = {
  id: string;
  clientId: string;
  title: string;
  items: ActionPlanItemDto[];
  generatedAt: string;
};

export type ClientNiche =
  | "clinica"
  | "ecommerce"
  | "infoproduto"
  | "imobiliaria"
  | "saas"
  | "apps_games"
  | "outro";
