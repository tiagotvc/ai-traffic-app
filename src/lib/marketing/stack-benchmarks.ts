/** Taxa USD→BRL usada para estimativas quando não há preço BRL fixo (jun/2026). */
export const USD_TO_BRL_RATE = 5.85;

export type StackBenchmarkTool = {
  id: string;
  /** Chave i18n marketing.bench*Label */
  labelKey: string;
  /** Chave i18n marketing.bench*Source */
  sourceKey: string;
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
    monthlyUsdCents: 3900,
    monthlyBrlCents: 22815,
    sourceUrl: "https://supermetrics.com/pricing"
  },
  supermetricsGrowth: {
    id: "supermetricsGrowth",
    labelKey: "benchSupermetricsGrowth",
    sourceKey: "benchSupermetricsGrowthSource",
    monthlyUsdCents: 19900,
    monthlyBrlCents: 116415,
    sourceUrl: "https://supermetrics.com/pricing"
  },
  supermetricsPro: {
    id: "supermetricsPro",
    labelKey: "benchSupermetricsPro",
    sourceKey: "benchSupermetricsProSource",
    monthlyUsdCents: 49900,
    monthlyBrlCents: 291915,
    sourceUrl: "https://supermetrics.com/pricing"
  },
  dashthisSolo: {
    id: "dashthisSolo",
    labelKey: "benchDashthisSolo",
    sourceKey: "benchDashthisSoloSource",
    monthlyUsdCents: 4900,
    monthlyBrlCents: 28665,
    sourceUrl: "https://dashthis.com/pricing"
  },
  dashthisPro: {
    id: "dashthisPro",
    labelKey: "benchDashthisPro",
    sourceKey: "benchDashthisProSource",
    monthlyUsdCents: 12900,
    monthlyBrlCents: 75465,
    sourceUrl: "https://dashthis.com/pricing"
  },
  dashthisBusiness: {
    id: "dashthisBusiness",
    labelKey: "benchDashthisBusiness",
    sourceKey: "benchDashthisBusinessSource",
    monthlyUsdCents: 22900,
    monthlyBrlCents: 133965,
    sourceUrl: "https://dashthis.com/pricing"
  },
  zapierPro: {
    id: "zapierPro",
    labelKey: "benchZapierPro",
    sourceKey: "benchZapierProSource",
    monthlyUsdCents: 2999,
    monthlyBrlCents: 17544,
    sourceUrl: "https://zapier.com/pricing"
  },
  zapierTeam: {
    id: "zapierTeam",
    labelKey: "benchZapierTeam",
    sourceKey: "benchZapierTeamSource",
    monthlyUsdCents: 10350,
    monthlyBrlCents: 60548,
    sourceUrl: "https://zapier.com/pricing"
  },
  zapierScale: {
    id: "zapierScale",
    labelKey: "benchZapierScale",
    sourceKey: "benchZapierScaleSource",
    monthlyUsdCents: 13000,
    monthlyBrlCents: 76050,
    sourceUrl: "https://zapier.com/pricing"
  },
  chatgptPlus: {
    id: "chatgptPlus",
    labelKey: "benchChatgptPlus",
    sourceKey: "benchChatgptPlusSource",
    monthlyUsdCents: 2000,
    monthlyBrlCents: 11700,
    sourceUrl: "https://openai.com/chatgpt/pricing"
  },
  chatgptTeam2: {
    id: "chatgptTeam2",
    labelKey: "benchChatgptTeam2",
    sourceKey: "benchChatgptTeam2Source",
    monthlyUsdCents: 6000,
    monthlyBrlCents: 35100,
    sourceUrl: "https://openai.com/chatgpt/pricing"
  },
  chatgptTeam5: {
    id: "chatgptTeam5",
    labelKey: "benchChatgptTeam5",
    sourceKey: "benchChatgptTeam5Source",
    monthlyUsdCents: 15000,
    monthlyBrlCents: 87750,
    sourceUrl: "https://openai.com/chatgpt/pricing"
  },
  motionPro: {
    id: "motionPro",
    labelKey: "benchMotionPro",
    sourceKey: "benchMotionProSource",
    monthlyUsdCents: 9900,
    monthlyBrlCents: 57915,
    sourceUrl: "https://www.usemotion.com/pricing"
  },
  notionTeam: {
    id: "notionTeam",
    labelKey: "benchNotionTeam",
    sourceKey: "benchNotionTeamSource",
    monthlyUsdCents: 5000,
    monthlyBrlCents: 29250,
    sourceUrl: "https://www.notion.so/pricing"
  },
  canvaPro: {
    id: "canvaPro",
    labelKey: "benchCanvaPro",
    sourceKey: "benchCanvaProSource",
    monthlyUsdCents: 1500,
    monthlyBrlCents: 8775,
    sourceUrl: "https://www.canva.com/pricing"
  },
  biAnalyst: {
    id: "biAnalyst",
    labelKey: "benchBiAnalyst",
    sourceKey: "benchBiAnalystSource",
    monthlyUsdCents: 4500,
    monthlyBrlCents: 26325,
    sourceUrl: "https://lookerstudio.google.com"
  }
};

/** Stack típico por plano Orion (ferramentas equivalentes que o cliente substituiria). */
export const PLAN_STACK_TOOL_IDS: Record<string, string[]> = {
  basic: ["dashthisSolo", "zapierPro", "chatgptPlus", "canvaPro", "biAnalyst"],
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
    "notionTeam",
    "biAnalyst"
  ],
  "agency-pro": [
    "supermetricsPro",
    "dashthisBusiness",
    "zapierScale",
    "chatgptTeam5",
    "motionPro",
    "notionTeam",
    "biAnalyst"
  ]
};

export function getStackToolsForPlan(slug: string, isBr: boolean): StackBenchmarkTool[] {
  const ids = PLAN_STACK_TOOL_IDS[slug] ?? PLAN_STACK_TOOL_IDS.advanced;
  return ids.map((id) => STACK_BENCHMARK_TOOLS[id]).filter(Boolean);
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
