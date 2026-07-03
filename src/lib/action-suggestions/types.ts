import type {
  ActionSuggestionPriority,
  ActionSuggestionSource,
  ActionSuggestionStatus,
  ActionSuggestionType
} from "@/db/entities/ClientActionSuggestion";

export type { ActionSuggestionSource, ActionSuggestionStatus, ActionSuggestionType, ActionSuggestionPriority };

export type ActionPayload = {
  metaCampaignId?: string;
  campaignName?: string;
  budgetIncreasePercent?: number;
  manualUrl?: string;
  checklist?: string[];
  /** `create_automation_rule` (Brain→Engine): payload do POST /api/automation/rules. */
  rulePayload?: {
    name: string;
    condition: {
      groups: Array<Array<{ metric: string; op: string; value: number }>>;
      minSpend?: number;
    };
    action: { type: string; budgetPercent?: number };
    executionMode: "approval";
  };
  /** Simulação de 30 dias anexada à proposta de regra. */
  simulationSummary?: {
    days: number;
    campaignsTriggered: number;
    alertDays: number;
    avoidedSpend: number;
    dailyBudgetIncrease: number;
  };
};

export type ActionEvidence = {
  ruleId?: string;
  reason?: string;
  deltaPercent?: number;
  baselineValue?: number;
  actualValue?: number;
  campaignName?: string;
  brainContextSnippet?: string;
  priorityScore?: number;
};

export type ActionSuggestionDto = {
  id: string;
  clientId: string;
  metaCampaignId: string | null;
  linkedLearningId: string | null;
  linkedHypothesisIds: string[];
  title: string;
  description: string;
  actionType: ActionSuggestionType;
  actionPayload: ActionPayload;
  source: ActionSuggestionSource;
  status: ActionSuggestionStatus;
  priority: ActionSuggestionPriority;
  linkedLearningIds: string[];
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
  priority?: ActionSuggestionPriority;
  page?: number;
  pageSize?: number;
  sortBy?: "createdAt" | "priority";
  sortDir?: "asc" | "desc";
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
  linkedLearningIds?: string[];
  linkedHypothesisIds?: string[];
  priority?: ActionSuggestionPriority;
  evidence: ActionEvidence;
  dedupeKey: string;
};
