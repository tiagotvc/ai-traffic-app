/** Taxa USD→BRL usada para estimativas quando não há preço BRL fixo (jun/2026). */
export const USD_TO_BRL_RATE = 5.85;

export type StackBenchmarkTool = {
  id: string;
  /** Chave i18n marketing.bench* */
  labelKey: string;
  /** Chave i18n marketing.bench*Source */
  sourceKey: string;
  /** Chave i18n marketing.bench*MapsTo — equivalência na Orion v1 */
  mapsToKey: string;
  monthlyUsdCents: number;
  monthlyBrlCents: number;
  sourceUrl: string;
};

/** Preços públicos pesquisados em jun/2026 — planos de entrada típicos para gestores/agências. */
export const STACK_BENCHMARK_TOOLS: Record<string, StackBenchmarkTool> = {
  supermetricsStarter: {
    id: "supermetricsStarter",
    labelKey: "benchSupermetricsStarter",
    sourceKey: "benchSupermetricsStarterSource",
    mapsToKey: "benchSupermetricsStarterMapsTo",
    monthlyUsdCents: 3900,
    monthlyBrlCents: 22815,
    sourceUrl: "https://supermetrics.com/pricing"
  },
  supermetricsGrowth: {
    id: "supermetricsGrowth",
    labelKey: "benchSupermetricsGrowth",
    sourceKey: "benchSupermetricsGrowthSource",
    mapsToKey: "benchSupermetricsGrowthMapsTo",
    monthlyUsdCents: 19900,
    monthlyBrlCents: 116415,
    sourceUrl: "https://supermetrics.com/pricing"
  },
  supermetricsPro: {
    id: "supermetricsPro",
    labelKey: "benchSupermetricsPro",
    sourceKey: "benchSupermetricsProSource",
    mapsToKey: "benchSupermetricsProMapsTo",
    monthlyUsdCents: 49900,
    monthlyBrlCents: 291915,
    sourceUrl: "https://supermetrics.com/pricing"
  },
  dashthisSolo: {
    id: "dashthisSolo",
    labelKey: "benchDashthisSolo",
    sourceKey: "benchDashthisSoloSource",
    mapsToKey: "benchDashthisSoloMapsTo",
    monthlyUsdCents: 4900,
    monthlyBrlCents: 28665,
    sourceUrl: "https://dashthis.com/pricing"
  },
  dashthisPro: {
    id: "dashthisPro",
    labelKey: "benchDashthisPro",
    sourceKey: "benchDashthisProSource",
    mapsToKey: "benchDashthisProMapsTo",
    monthlyUsdCents: 12900,
    monthlyBrlCents: 75465,
    sourceUrl: "https://dashthis.com/pricing"
  },
  dashthisBusiness: {
    id: "dashthisBusiness",
    labelKey: "benchDashthisBusiness",
    sourceKey: "benchDashthisBusinessSource",
    mapsToKey: "benchDashthisBusinessMapsTo",
    monthlyUsdCents: 22900,
    monthlyBrlCents: 133965,
    sourceUrl: "https://dashthis.com/pricing"
  },
  zapierPro: {
    id: "zapierPro",
    labelKey: "benchZapierPro",
    sourceKey: "benchZapierProSource",
    mapsToKey: "benchZapierProMapsTo",
    monthlyUsdCents: 2999,
    monthlyBrlCents: 17544,
    sourceUrl: "https://zapier.com/pricing"
  },
  zapierTeam: {
    id: "zapierTeam",
    labelKey: "benchZapierTeam",
    sourceKey: "benchZapierTeamSource",
    mapsToKey: "benchZapierTeamMapsTo",
    monthlyUsdCents: 10350,
    monthlyBrlCents: 60548,
    sourceUrl: "https://zapier.com/pricing"
  },
  zapierScale: {
    id: "zapierScale",
    labelKey: "benchZapierScale",
    sourceKey: "benchZapierScaleSource",
    mapsToKey: "benchZapierScaleMapsTo",
    monthlyUsdCents: 13000,
    monthlyBrlCents: 76050,
    sourceUrl: "https://zapier.com/pricing"
  },
  chatgptPlus: {
    id: "chatgptPlus",
    labelKey: "benchChatgptPlus",
    sourceKey: "benchChatgptPlusSource",
    mapsToKey: "benchChatgptPlusMapsTo",
    monthlyUsdCents: 2000,
    monthlyBrlCents: 11700,
    sourceUrl: "https://openai.com/chatgpt/pricing"
  },
  chatgptTeam2: {
    id: "chatgptTeam2",
    labelKey: "benchChatgptTeam2",
    sourceKey: "benchChatgptTeam2Source",
    mapsToKey: "benchChatgptTeam2MapsTo",
    monthlyUsdCents: 6000,
    monthlyBrlCents: 35100,
    sourceUrl: "https://openai.com/chatgpt/pricing"
  },
  chatgptTeam5: {
    id: "chatgptTeam5",
    labelKey: "benchChatgptTeam5",
    sourceKey: "benchChatgptTeam5Source",
    mapsToKey: "benchChatgptTeam5MapsTo",
    monthlyUsdCents: 15000,
    monthlyBrlCents: 87750,
    sourceUrl: "https://openai.com/chatgpt/pricing"
  },
  motionPro: {
    id: "motionPro",
    labelKey: "benchMotionPro",
    sourceKey: "benchMotionProSource",
    mapsToKey: "benchMotionProMapsTo",
    monthlyUsdCents: 9900,
    monthlyBrlCents: 57915,
    sourceUrl: "https://www.usemotion.com/pricing"
  },
  notionTeam: {
    id: "notionTeam",
    labelKey: "benchNotionTeam",
    sourceKey: "benchNotionTeamSource",
    mapsToKey: "benchNotionTeamMapsTo",
    monthlyUsdCents: 5000,
    monthlyBrlCents: 29250,
    sourceUrl: "https://www.notion.so/pricing"
  },
  canvaPro: {
    id: "canvaPro",
    labelKey: "benchCanvaPro",
    sourceKey: "benchCanvaProSource",
    mapsToKey: "benchCanvaProMapsTo",
    monthlyUsdCents: 1500,
    monthlyBrlCents: 8775,
    sourceUrl: "https://www.canva.com/pricing"
  },
  biAnalyst: {
    id: "biAnalyst",
    labelKey: "benchBiAnalyst",
    sourceKey: "benchBiAnalystSource",
    mapsToKey: "benchBiAnalystMapsTo",
    monthlyUsdCents: 4500,
    monthlyBrlCents: 26325,
    sourceUrl: "https://lookerstudio.google.com"
  }
};

/**
 * Stack típico por plano Orion — ferramentas com função semelhante ao que o plano entrega na v1.
 * Individual: sem automações. Advanced+: inclui automações e live Meta.
 */
export const PLAN_STACK_TOOL_IDS: Record<string, string[]> = {
  basic: ["dashthisSolo", "chatgptPlus", "motionPro", "canvaPro"],
  advanced: [
    "supermetricsStarter",
    "dashthisPro",
    "zapierTeam",
    "chatgptTeam2",
    "motionPro",
    "notionTeam"
  ],
  "advanced-pro": [
    "supermetricsGrowth",
    "dashthisPro",
    "zapierTeam",
    "chatgptTeam2",
    "motionPro",
    "notionTeam"
  ],
  agency: [
    "supermetricsGrowth",
    "dashthisBusiness",
    "zapierScale",
    "chatgptTeam5",
    "motionPro",
    "notionTeam"
  ],
  "agency-pro": [
    "supermetricsPro",
    "dashthisBusiness",
    "zapierScale",
    "chatgptTeam5",
    "motionPro",
    "notionTeam"
  ]
};

/** Chave i18n marketing.orionIncludes* por slug de plano na vitrine. */
export const PLAN_ORION_INCLUDES_KEY: Record<string, string> = {
  basic: "orionIncludesBasic",
  advanced: "orionIncludesAdvanced",
  agency: "orionIncludesAgency",
  "advanced-pro": "orionIncludesAdvanced",
  "agency-pro": "orionIncludesAgency"
};

export function getStackToolsForPlan(slug: string): StackBenchmarkTool[] {
  const ids = PLAN_STACK_TOOL_IDS[slug] ?? PLAN_STACK_TOOL_IDS.advanced;
  return ids.map((id) => STACK_BENCHMARK_TOOLS[id]).filter(Boolean);
}

export function getOrionIncludesKey(slug: string): string {
  return PLAN_ORION_INCLUDES_KEY[slug] ?? "orionIncludesAdvanced";
}

export function sumStackMonthlyCents(tools: StackBenchmarkTool[], isBr: boolean): number {
  return tools.reduce((sum, t) => sum + (isBr ? t.monthlyBrlCents : t.monthlyUsdCents), 0);
}

export function formatBenchmarkPrice(cents: number, isBr: boolean): string {
  const value = cents / 100;
  if (isBr) {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  const formatted = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
  return `$${formatted}`;
}
