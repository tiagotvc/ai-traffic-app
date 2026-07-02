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
