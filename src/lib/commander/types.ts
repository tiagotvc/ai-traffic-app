export type CommanderStatus = "idle" | "analyzing" | "ready" | "warning" | "blocked" | "complete";
export type PipelineStatus = "pending" | "running" | "done" | "error";

export type CommanderPipelineStep = {
  key: string;
  label: string;
  description: string;
  status: PipelineStatus;
};

export type CommanderInsight = {
  id: string;
  type: "opportunity" | "warning" | "recommendation" | "benchmark";
  title: string;
  description: string;
  impact: "low" | "medium" | "high";
  confidence: number | null;
  source: string;
  evidence?: Record<string, unknown>;
  sources?: string[];
  actionLabel?: string;
};

export type CommanderNextAction = {
  label: string;
  description: string;
  actionType: string;
};

export type CommanderState = {
  status: CommanderStatus;
  confidence: number | null;
  activeScientist?: string;
  insightsCount: number;
  pipeline: CommanderPipelineStep[];
  insights: CommanderInsight[];
  nextAction?: CommanderNextAction;
};

/**
 * Proposta de regra do Engine gerada pelo Commander (aresta Commander→Engine).
 * O payload é o mesmo do `POST /api/automation/rules`; a simulação anexada segue o
 * contrato de artefatos do ecossistema (proposta sempre acompanha evidência).
 */
export type CommanderRuleProposalSimulation = {
  supported: boolean;
  days: number;
  campaignsTriggered: number;
  alertDays: number;
  avoidedSpend: number;
  dailyBudgetIncrease: number;
};

export type CommanderRuleProposal = {
  name: string;
  clientId: string | null;
  condition: {
    groups: Array<Array<{ metric: string; op: string; value: number }>>;
    minSpend?: number;
  };
  action: { type: string; budgetPercent?: number; steps?: number };
  executionMode: "alert" | "approval" | "auto";
  simulation: CommanderRuleProposalSimulation | null;
};
