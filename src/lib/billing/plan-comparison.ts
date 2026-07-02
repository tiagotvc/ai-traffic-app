import type { PlanLimits } from "./types";

export type FeatureRow = { key: keyof PlanLimits; label: string; kind: "number" | "boolean" };

/** As 13 dimensões comparadas — mesma fonte usada pelo enforcement real (PlanLimits). */
export const FEATURE_ROWS: FeatureRow[] = [
  { key: "maxClients", label: "Clientes ativos", kind: "number" },
  { key: "maxAdAccounts", label: "Contas de anúncio", kind: "number" },
  { key: "maxMembers", label: "Membros da equipe", kind: "number" },
  { key: "maxAutomationRules", label: "Regras de automação", kind: "number" },
  { key: "maxAiRequestsPerMonth", label: "Créditos de IA / mês", kind: "number" },
  { key: "maxScheduledReports", label: "Relatórios agendados", kind: "number" },
  { key: "allowAutoSync", label: "Sincronização automática", kind: "boolean" },
  { key: "allowLiveMeta", label: "Meta Ads ao vivo", kind: "boolean" },
  { key: "allowCopilot", label: "Commander — Scientists", kind: "boolean" },
  { key: "maxAudiencePersonas", label: "Criador de Públicos Inteligente", kind: "number" },
  { key: "allowRankingConfig", label: "Ranking de Criativos personalizado", kind: "boolean" },
  { key: "allowAgencyBrainHypotheses", label: "Agency Brain (hipóteses, DNA, timeline)", kind: "boolean" },
  { key: "allowWhiteLabel", label: "White label", kind: "boolean" }
];

/** "Plus" = a variante -pro/-plus de cada plano base — marcada com o selo PLUS no comparativo. */
export const PLUS_PAIRS: Record<string, string> = {
  basic: "basic-plus",
  advanced: "advanced-pro",
  agency: "agency-pro"
};
export const PLUS_SLUGS = new Set(Object.values(PLUS_PAIRS));

/** Ordem de exibição dos 6 planos pagos no comparativo (checkout e landing). */
export const COMPARISON_PLAN_SLUG_ORDER = [
  "basic",
  "basic-plus",
  "advanced",
  "advanced-pro",
  "agency",
  "agency-pro"
];

export function formatLimitValue(value: number): string {
  return value < 0 ? "Ilimitado" : String(value);
}

export type MarketingFeatureValue = number | boolean | string;
export type MarketingFeatureRow = {
  key: string;
  label: string;
  values: Record<string, MarketingFeatureValue>;
};

/** Matriz comercial aprovada. Mantida separada dos limites técnicos para também
 * representar benefícios sem quota (Dashboard, criadores e Commander). */
export const MARKETING_FEATURE_ROWS: MarketingFeatureRow[] = [
  { key: "clients", label: "Clientes", values: { basic: 5, "basic-plus": 7, advanced: 10, "advanced-pro": 13, agency: 20, "agency-pro": 25 } },
  { key: "adAccounts", label: "Contas de anúncios", values: { basic: 10, "basic-plus": 12, advanced: 15, "advanced-pro": 18, agency: 30, "agency-pro": 40 } },
  { key: "campaignCreator", label: "Criador de Campanhas Inteligente", values: { basic: "Ilimitado", "basic-plus": "Ilimitado", advanced: "Ilimitado", "advanced-pro": "Ilimitado", agency: "Ilimitado", "agency-pro": "Ilimitado" } },
  { key: "audienceCreator", label: "Criador de Públicos Inteligente", values: { basic: 5, "basic-plus": 5, advanced: "Ilimitado", "advanced-pro": "Ilimitado", agency: "Ilimitado", "agency-pro": "Ilimitado" } },
  { key: "creativeCreator", label: "Criador de Criativos", values: { basic: "Ilimitado", "basic-plus": "Ilimitado", advanced: "Ilimitado", "advanced-pro": "Ilimitado", agency: "Ilimitado", "agency-pro": "Ilimitado" } },
  { key: "adCreator", label: "Criador de Anúncios", values: { basic: "Ilimitado", "basic-plus": "Ilimitado", advanced: "Ilimitado", "advanced-pro": "Ilimitado", agency: "Ilimitado", "agency-pro": "Ilimitado" } },
  { key: "creativeRanking", label: "Ranking de Criativos", values: { basic: false, "basic-plus": false, advanced: true, "advanced-pro": true, agency: true, "agency-pro": true } },
  { key: "aiCredits", label: "Créditos Orion (IA) / mês", values: { basic: 50, "basic-plus": 70, advanced: 150, "advanced-pro": 200, agency: 250, "agency-pro": 500 } },
  { key: "members", label: "Usuários por workspace", values: { basic: 1, "basic-plus": 1, advanced: 3, "advanced-pro": 4, agency: 10, "agency-pro": 15 } },
  { key: "brain", label: "Memória e benchmarks", values: { basic: false, "basic-plus": false, advanced: true, "advanced-pro": true, agency: true, "agency-pro": true } },
  { key: "copilot", label: "Commander — Scientists", values: { basic: false, "basic-plus": false, advanced: "2 Scientists", "advanced-pro": "3 Scientists", agency: "5 Scientists", "agency-pro": "Ilimitado" } },
  { key: "reports", label: "Relatórios", values: { basic: 5, "basic-plus": 7, advanced: 10, "advanced-pro": 13, agency: 30, "agency-pro": 50 } },
  { key: "dashboard", label: "Dashboard", values: { basic: true, "basic-plus": true, advanced: true, "advanced-pro": true, agency: true, "agency-pro": true } }
];
