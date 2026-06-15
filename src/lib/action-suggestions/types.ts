import type {
  ActionSuggestionSource,
  ActionSuggestionStatus,
  ActionSuggestionType
} from "@/db/entities/ClientActionSuggestion";

export type { ActionSuggestionSource, ActionSuggestionStatus, ActionSuggestionType };

export type ActionPayload = {
  metaCampaignId?: string;
  campaignName?: string;
  budgetIncreasePercent?: number;
  manualUrl?: string;
  checklist?: string[];
};

export type ActionEvidence = {
  ruleId?: string;
  reason?: string;
  deltaPercent?: number;
  baselineValue?: number;
  actualValue?: number;
  campaignName?: string;
  brainContextSnippet?: string;
};

export type ActionSuggestionDto = {
  id: string;
  clientId: string;
  metaCampaignId: string | null;
  linkedLearningId: string | null;
  title: string;
  description: string;
  actionType: ActionSuggestionType;
  actionPayload: ActionPayload;
  source: ActionSuggestionSource;
  status: ActionSuggestionStatus;
  evidence: ActionEvidence | null;
  resolvedByUserId: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ActionSuggestionFilters = {
  status?: ActionSuggestionStatus;
  actionType?: ActionSuggestionType;
  source?: ActionSuggestionSource;
  page?: number;
  pageSize?: number;
};

export type ActionSuggestionSummary = {
  pending: number;
  executed: number;
  acknowledged: number;
  rejected: number;
};

export type SuggestedActionDraft = {
  title: string;
  description: string;
  actionType: ActionSuggestionType;
  actionPayload: ActionPayload;
  source: ActionSuggestionSource;
  metaCampaignId?: string | null;
  linkedLearningId?: string | null;
  evidence: ActionEvidence;
  dedupeKey: string;
};
