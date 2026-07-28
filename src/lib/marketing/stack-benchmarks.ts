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

/**
 * Custo de mercado por FUNÇÃO (não por marca) que a Orion cobre.
 * Preços de ENTRADA realistas (jun/2026) — ilustrativos, não substituição literal.
 * Câmbio USD→BRL ~5,85.
 */
export const STACK_BENCHMARK_TOOLS: Record<string, StackBenchmarkTool> = {
  supermetricsStarter: {
    id: "supermetricsStarter",
    labelKey: "benchSupermetricsStarter",
    sourceKey: "benchSupermetricsStarterSource",
    mapsToKey: "benchSupermetricsStarterMapsTo",
    monthlyUsdCents: 2050,
    monthlyBrlCents: 12000,
    sourceUrl: "https://supermetrics.com/pricing"
  },
  supermetricsGrowth: {
    id: "supermetricsGrowth",
    labelKey: "benchSupermetricsGrowth",
    sourceKey: "benchSupermetricsGrowthSource",
    mapsToKey: "benchSupermetricsGrowthMapsTo",
    monthlyUsdCents: 5130,
    monthlyBrlCents: 30000,
    sourceUrl: "https://supermetrics.com/pricing"
  },
  supermetricsPro: {
    id: "supermetricsPro",
    labelKey: "benchSupermetricsPro",
    sourceKey: "benchSupermetricsProSource",
    mapsToKey: "benchSupermetricsProMapsTo",
    monthlyUsdCents: 10250,
    monthlyBrlCents: 60000,
    sourceUrl: "https://supermetrics.com/pricing"
  },
  dashthisSolo: {
    id: "dashthisSolo",
    labelKey: "benchDashthisSolo",
    sourceKey: "benchDashthisSoloSource",
    mapsToKey: "benchDashthisSoloMapsTo",
    monthlyUsdCents: 1540,
    monthlyBrlCents: 9000,
    sourceUrl: "https://lookerstudio.google.com"
  },
  dashthisPro: {
    id: "dashthisPro",
    labelKey: "benchDashthisPro",
    sourceKey: "benchDashthisProSource",
    mapsToKey: "benchDashthisProMapsTo",
    monthlyUsdCents: 3080,
    monthlyBrlCents: 18000,
    sourceUrl: "https://lookerstudio.google.com"
  },
  dashthisBusiness: {
    id: "dashthisBusiness",
    labelKey: "benchDashthisBusiness",
    sourceKey: "benchDashthisBusinessSource",
    mapsToKey: "benchDashthisBusinessMapsTo",
    monthlyUsdCents: 5470,
    monthlyBrlCents: 32000,
    sourceUrl: "https://lookerstudio.google.com"
  },
  zapierPro: {
    id: "zapierPro",
    labelKey: "benchZapierPro",
    sourceKey: "benchZapierProSource",
    mapsToKey: "benchZapierProMapsTo",
    monthlyUsdCents: 1540,
    monthlyBrlCents: 9000,
    sourceUrl: "https://zapier.com/pricing"
  },
  zapierTeam: {
    id: "zapierTeam",
    labelKey: "benchZapierTeam",
    sourceKey: "benchZapierTeamSource",
    mapsToKey: "benchZapierTeamMapsTo",
    monthlyUsdCents: 3420,
    monthlyBrlCents: 20000,
    sourceUrl: "https://zapier.com/pricing"
  },
  zapierScale: {
    id: "zapierScale",
    labelKey: "benchZapierScale",
    sourceKey: "benchZapierScaleSource",
    mapsToKey: "benchZapierScaleMapsTo",
    monthlyUsdCents: 5130,
    monthlyBrlCents: 30000,
    sourceUrl: "https://zapier.com/pricing"
  },
  chatgptPlus: {
    id: "chatgptPlus",
    labelKey: "benchChatgptPlus",
    sourceKey: "benchChatgptPlusSource",
    mapsToKey: "benchChatgptPlusMapsTo",
    monthlyUsdCents: 1880,
    monthlyBrlCents: 11000,
    sourceUrl: "https://openai.com/chatgpt/pricing"
  },
  chatgptTeam2: {
    id: "chatgptTeam2",
    labelKey: "benchChatgptTeam2",
    sourceKey: "benchChatgptTeam2Source",
    mapsToKey: "benchChatgptTeam2MapsTo",
    monthlyUsdCents: 3080,
    monthlyBrlCents: 18000,
    sourceUrl: "https://openai.com/chatgpt/pricing"
  },
  chatgptTeam5: {
    id: "chatgptTeam5",
    labelKey: "benchChatgptTeam5",
    sourceKey: "benchChatgptTeam5Source",
    mapsToKey: "benchChatgptTeam5MapsTo",
    monthlyUsdCents: 5130,
    monthlyBrlCents: 30000,
    sourceUrl: "https://openai.com/chatgpt/pricing"
  },
  notionTeam: {
    id: "notionTeam",
    labelKey: "benchNotionTeam",
    sourceKey: "benchNotionTeamSource",
    mapsToKey: "benchNotionTeamMapsTo",
    monthlyUsdCents: 2050,
    monthlyBrlCents: 12000,
    sourceUrl: "https://www.notion.so/pricing"
  }
};

/**
 * Funções cobertas por plano Orion (4–5 por plano). Uma linha = uma função, não uma marca.
 * Individual: sem automações. Advanced+: inclui automações e live Meta.
 */
export const PLAN_STACK_TOOL_IDS: Record<string, string[]> = {
  basic: ["supermetricsStarter", "dashthisSolo", "chatgptPlus", "notionTeam"],
  advanced: ["supermetricsStarter", "dashthisPro", "zapierTeam", "chatgptTeam2", "notionTeam"],
  "advanced-pro": ["supermetricsGrowth", "dashthisPro", "zapierTeam", "chatgptTeam2", "notionTeam"],
  agency: ["supermetricsGrowth", "dashthisBusiness", "zapierScale", "chatgptTeam5", "notionTeam"],
  "agency-pro": ["supermetricsPro", "dashthisBusiness", "zapierScale", "chatgptTeam5", "notionTeam"]
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
