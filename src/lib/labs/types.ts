/** Mirror of scientists-worker/src/lib/types.ts — keep in sync (MVP manual). */

export type ScientistTier = "basic" | "pro" | "premium";

export type ScientistFindingType =
  | "hook"
  | "pain"
  | "desire"
  | "objection"
  | "offer"
  | "creative_pattern"
  | "trend"
  | "competitor_pattern"
  | "audience"
  | "pricing"
  | "opportunity"
  | "risk";

export type LabsExperimentStatus =
  | "draft"
  | "queued"
  | "running"
  | "collecting_data"
  | "analyzing"
  | "generating_hypotheses"
  | "calculating_confidence"
  | "finalizing"
  | "completed"
  | "failed"
  | "cancelled";

export type LabsExperimentDto = {
  id: string;
  tenantId: string;
  userId: string;
  clientId: string | null;
  clientName: string | null;
  name: string;
  product: string;
  niche: string | null;
  market: string | null;
  country: string | null;
  language: string | null;
  objective: string | null;
  competitors: string[];
  websiteUrl: string | null;
  selectedScientists: string[];
  status: LabsExperimentStatus;
  estimatedCredits: number;
  creditsUsed: number;
  maxCredits: number | null;
  maxDurationMinutes: number | null;
  dossier: Record<string, unknown> | null;
  errorMessage: string | null;
  /** Elo Hypothesis→Experiment→Learning (Fase 3, docs/orion-architecture §2.2). */
  hypothesisId: string | null;
  resultLearningId: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type LabsAgentRunDto = {
  id: string;
  experimentId: string;
  scientistId: string;
  status: string;
  summary: string | null;
  creditsUsed: number;
  durationMs: number | null;
  startedAt: string;
  completedAt: string | null;
};

export const MVP_SCIENTIST_IDS = [
  "competitor",
  "consumer",
  "trend",
  "hypothesis",
  "confidence"
] as const;

export const SCIENTIST_CREDITS: Record<string, number> = {
  competitor: 10,
  consumer: 12,
  trend: 8,
  hypothesis: 6,
  confidence: 4,
  creative: 12,
  offer: 8,
  vision: 30,
  simulation: 40
};

export function estimateCredits(scientistIds: string[]): number {
  return scientistIds.reduce((sum, id) => sum + (SCIENTIST_CREDITS[id] ?? 5), 0);
}
