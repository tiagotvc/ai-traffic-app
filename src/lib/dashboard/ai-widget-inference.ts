import { getWidgetDefinition } from "@/lib/dashboard/widget-catalog";
import { defaultWidgetConfig } from "@/lib/dashboard/widget-config";

export type InferredWidget = {
  widgetType: string;
  config: Record<string, unknown>;
  titleKey: string;
  confidence: "high" | "medium" | "default";
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(normalize(term)));
}

function inferDualChart(text: string): InferredWidget | null {
  const pairs: Array<{ termsA: string[]; termsB: string[]; widgetType: string; metricA: string; metricB: string }> = [
    { termsA: ["roas"], termsB: ["cpa", "custo por"], widgetType: "chart.roasCpa", metricA: "roas", metricB: "cpa" },
    {
      termsA: ["gasto", "spend", "investimento"],
      termsB: ["convers", "conversion"],
      widgetType: "chart.spendConversions",
      metricA: "spend",
      metricB: "conversions"
    },
    {
      termsA: ["impress", "impression"],
      termsB: ["clique", "click"],
      widgetType: "chart.impressionsClicks",
      metricA: "impressions",
      metricB: "clicks"
    },
    { termsA: ["ctr"], termsB: ["cpc"], widgetType: "chart.ctrCpc", metricA: "ctr", metricB: "cpc" },
    {
      termsA: ["gasto", "spend"],
      termsB: ["roas"],
      widgetType: "chart.spendRoas",
      metricA: "spend",
      metricB: "roas"
    },
    {
      termsA: ["alcance", "reach"],
      termsB: ["frequen", "frequency"],
      widgetType: "chart.reachFrequency",
      metricA: "reach",
      metricB: "frequency"
    },
    { termsA: ["cpm"], termsB: ["cpa", "custo por"], widgetType: "chart.cpmCpa", metricA: "cpm", metricB: "cpa" }
  ];

  for (const pair of pairs) {
    if (includesAny(text, pair.termsA) && includesAny(text, pair.termsB)) {
      const def = getWidgetDefinition(pair.widgetType);
      if (!def) continue;
      return {
        widgetType: pair.widgetType,
        config: { ...defaultWidgetConfig(pair.widgetType), metricA: pair.metricA, metricB: pair.metricB },
        titleKey: def.titleKey,
        confidence: "high"
      };
    }
  }
  return null;
}

function inferSingleMetric(text: string): InferredWidget | null {
  const supportedSingle = new Set(["spend", "roas", "cpa", "ctr", "conversions"]);
  const metrics: Array<{ terms: string[]; key: string }> = [
    { terms: ["roas"], key: "roas" },
    { terms: ["cpa", "custo por aquisicao", "custo por conversao"], key: "cpa" },
    { terms: ["ctr"], key: "ctr" },
    { terms: ["gasto", "spend", "investimento"], key: "spend" },
    { terms: ["convers", "conversion"], key: "conversions" }
  ];

  for (const metric of metrics) {
    if (!includesAny(text, metric.terms)) continue;
    if (!supportedSingle.has(metric.key)) continue;
    const widgetType = `metric.single.${metric.key}`;
    const def = getWidgetDefinition(widgetType);
    if (!def) continue;
    return {
      widgetType,
      config: { ...defaultWidgetConfig(widgetType), metricKey: metric.key },
      titleKey: def.titleKey,
      confidence: "medium"
    };
  }
  return null;
}

export function inferWidgetFromPrompt(prompt: string): InferredWidget | null {
  const text = normalize(prompt.trim());
  if (text.length < 3) return null;

  const dual = inferDualChart(text);
  if (dual) return dual;

  if (includesAny(text, ["saude", "health", "conta"])) {
    const widgetType = "ai.accountHealth";
    const def = getWidgetDefinition(widgetType);
    if (def) {
      return {
        widgetType,
        config: defaultWidgetConfig(widgetType),
        titleKey: def.titleKey,
        confidence: "high"
      };
    }
  }

  if (includesAny(text, ["cerebro", "brain", "agencia"])) {
    const widgetType = "ai.agencyBrain";
    const def = getWidgetDefinition(widgetType);
    if (def) {
      return {
        widgetType,
        config: defaultWidgetConfig(widgetType),
        titleKey: def.titleKey,
        confidence: "high"
      };
    }
  }

  if (includesAny(text, ["correlac", "correlation"])) {
    const widgetType = "ai.correlation";
    const def = getWidgetDefinition(widgetType);
    if (def) {
      return {
        widgetType,
        config: defaultWidgetConfig(widgetType),
        titleKey: def.titleKey,
        confidence: "high"
      };
    }
  }

  if (includesAny(text, ["scatter", "dispers"])) {
    const widgetType = "advanced.scatter";
    const def = getWidgetDefinition(widgetType);
    if (def) {
      return {
        widgetType,
        config: defaultWidgetConfig(widgetType),
        titleKey: def.titleKey,
        confidence: "high"
      };
    }
  }

  if (includesAny(text, ["heatmap", "mapa de calor", "calor"])) {
    const widgetType = "advanced.heatmap";
    const def = getWidgetDefinition(widgetType);
    if (def) {
      return {
        widgetType,
        config: defaultWidgetConfig(widgetType),
        titleKey: def.titleKey,
        confidence: "high"
      };
    }
  }

  if (includesAny(text, ["radar"])) {
    const widgetType = "advanced.radar";
    const def = getWidgetDefinition(widgetType);
    if (def) {
      return {
        widgetType,
        config: defaultWidgetConfig(widgetType),
        titleKey: def.titleKey,
        confidence: "high"
      };
    }
  }

  if (includesAny(text, ["pareto"])) {
    const widgetType = "advanced.pareto";
    const def = getWidgetDefinition(widgetType);
    if (def) {
      return {
        widgetType,
        config: defaultWidgetConfig(widgetType),
        titleKey: def.titleKey,
        confidence: "high"
      };
    }
  }

  if (includesAny(text, ["performance", "desempenho", "linha do tempo", "evolucao"])) {
    const widgetType = "chart.performance";
    const def = getWidgetDefinition(widgetType);
    if (def) {
      return {
        widgetType,
        config: defaultWidgetConfig(widgetType),
        titleKey: def.titleKey,
        confidence: "medium"
      };
    }
  }

  if (includesAny(text, ["alerta", "alert"])) {
    const widgetType = "alerts.feed";
    const def = getWidgetDefinition(widgetType);
    if (def) {
      return {
        widgetType,
        config: defaultWidgetConfig(widgetType),
        titleKey: def.titleKey,
        confidence: "medium"
      };
    }
  }

  const single = inferSingleMetric(text);
  if (single) return single;

  if (includesAny(text, ["kpi", "kpis", "resumo", "principais", "hero"])) {
    const widgetType = "metrics.heroKpis";
    const def = getWidgetDefinition(widgetType);
    if (def) {
      return {
        widgetType,
        config: defaultWidgetConfig(widgetType),
        titleKey: def.titleKey,
        confidence: "default"
      };
    }
  }

  const widgetType = "metrics.heroKpis";
  const def = getWidgetDefinition(widgetType);
  if (!def) return null;

  return {
    widgetType,
    config: defaultWidgetConfig(widgetType),
    titleKey: def.titleKey,
    confidence: "default"
  };
}

export const AI_BUILDER_SUGGESTION_KEYS = [
  "aiBuilderSuggestion1",
  "aiBuilderSuggestion2",
  "aiBuilderSuggestion3",
  "aiBuilderSuggestion4"
] as const;

export const AI_BUILDER_MIN_PROMPT_LENGTH = 10;
