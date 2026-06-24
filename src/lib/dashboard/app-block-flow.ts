import type { AppBlockConfig, AppBlockIntent } from "@/lib/dashboard/app-block-config";

export type WizardStepId =
  | "intent"
  | "metrics"
  | "period"
  | "compare"
  | "display"
  | "chartType"
  | "visual"
  | "goalMetric"
  | "goalRule"
  | "goalValue"
  | "goalAlert"
  | "tableEntity"
  | "tableColumns"
  | "tableFilters"
  | "tableSort"
  | "confirm";

export function stepsForIntent(intent: AppBlockIntent | null): WizardStepId[] {
  switch (intent) {
    case "analyze":
      return ["intent", "metrics", "period", "compare", "display", "chartType", "visual", "confirm"];
    case "goal":
      return ["intent", "goalMetric", "goalRule", "goalValue", "period", "goalAlert", "confirm"];
    case "table":
      return ["intent", "tableEntity", "tableColumns", "tableFilters", "tableSort", "period", "confirm"];
    case "compound":
      return ["intent", "confirm"];
    default:
      return ["intent"];
  }
}

export function stepLabelKey(step: WizardStepId): string {
  return `wizardStep_${step}`;
}

export function shouldShowChartTypeStep(config: AppBlockConfig | null): boolean {
  if (!config || config.intent !== "analyze") return false;
  return config.displayMode === "chart" || config.displayMode === "both";
}

export function filteredSteps(config: AppBlockConfig | null): WizardStepId[] {
  const intent = config?.intent ?? null;
  let steps = stepsForIntent(intent);
  if (!shouldShowChartTypeStep(config)) {
    steps = steps.filter((s) => s !== "chartType");
  }
  return steps;
}

export function validateStep(step: WizardStepId, config: AppBlockConfig | null): boolean {
  if (!config) return step === "intent";
  switch (step) {
    case "intent":
      return true;
    case "metrics":
      return config.intent === "analyze" && config.metricKeys.length > 0;
    case "period":
      return Boolean(config.periodPreset);
    case "compare":
      return config.intent === "analyze";
    case "display":
      return config.intent === "analyze";
    case "chartType":
      return config.intent === "analyze" && Boolean(config.chartStyle);
    case "visual":
      return true;
    case "goalMetric":
      return config.intent === "goal" && Boolean(config.metricKey);
    case "goalRule":
      return config.intent === "goal" && Boolean(config.operator);
    case "goalValue":
      return config.intent === "goal" && config.targetValue > 0;
    case "goalAlert":
      return config.intent === "goal";
    case "tableEntity":
      return config.intent === "table" && Boolean(config.entity);
    case "tableColumns":
      return config.intent === "table" && config.columns.length > 0;
    case "tableFilters":
      return config.intent === "table";
    case "tableSort":
      return config.intent === "table";
    case "confirm":
      return true;
    default:
      return false;
  }
}
