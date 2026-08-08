import type { PlanLimits } from "./types";

/** Ordem de exibição dos 3 planos pagos (checkout, comparativo e landing). */
export const COMPARISON_PLAN_SLUG_ORDER = ["basic", "advanced", "agency"];

export type MarketingFeatureValue = number | boolean | string;

/** Sentinela para "sem teto" — quem exibe traduz (ver `resolvePlanFeatureValue`). */
export const UNLIMITED = "__unlimited__";

export function formatLimitValue(value: number): string {
  return value < 0 ? UNLIMITED : String(value);
}

export type PlanFeatureVisibilityRow = {
  featureKey: string;
  showCompact: boolean;
  showFull: boolean;
  sortOrder: number;
};

/** Filtra e ordena PLAN_DISPLAY_ROWS pelas flags editáveis no admin (/admin/billing/plans). */
export function visiblePlanDisplayRows(
  variant: "compact" | "full",
  visibility: PlanFeatureVisibilityRow[] | undefined
): PlanDisplayRow[] {
  if (!visibility?.length) return PLAN_DISPLAY_ROWS;
  const byKey = new Map(visibility.map((v) => [v.featureKey, v]));
  return [...PLAN_DISPLAY_ROWS]
    .filter((row) => {
      const v = byKey.get(row.key);
      if (!v) return true;
      return variant === "compact" ? v.showCompact : v.showFull;
    })
    .sort((a, b) => (byKey.get(a.key)?.sortOrder ?? 0) - (byKey.get(b.key)?.sortOrder ?? 0));
}

export type PlanDisplayRow = {
  /** Chave estável — também usada pela tabela de visibilidade (Fase 4). */
  key: string;
  /**
   * Chave de tradução no namespace `billingPage` (ex.: `planFeature.clients`).
   * Antes isto era um literal em português, que vazava para a vitrine em inglês.
   */
  labelKey: string;
  /** Computa o valor de exibição ao vivo a partir do PlanLimits resolvido do DB. */
  value: (limits: PlanLimits) => MarketingFeatureValue;
};

/** Quantidade de Scientists — o número é dado, o texto ao redor é traduzido. */
export const SCIENTISTS_PREFIX = "__scientists__:";

/**
 * Definição das linhas de recurso exibidas na vitrine/comparativo/checkout. O valor
 * exibido é SEMPRE calculado ao vivo a partir do PlanLimits que vem do DB (nunca mais
 * hardcoded por slug) — a definição da linha (label, de onde tira o valor, formatação)
 * continua no código porque é estrutural, não algo que um admin edita linha a linha.
 *
 * 4 linhas (campaignCreator/audienceCreator/creativeCreator/adCreator) não têm um campo
 * de quota de CONTAGEM no PlanLimits — publicar/gerar consome do pool de créditos de IA
 * (linha "aiCredits" abaixo), não tem teto de quantidade separado. Por isso é só check
 * (incluso), não "Ilimitado": dizer "ilimitado" seria enganoso quando o consumo real é
 * limitado pelo crédito mensal.
 */
export const PLAN_DISPLAY_ROWS: PlanDisplayRow[] = [
  { key: "clients", labelKey: "planFeatureClients", value: (l) => formatLimitValue(l.maxClients) },
  { key: "adAccounts", labelKey: "planFeatureAdAccounts", value: (l) => formatLimitValue(l.maxAdAccounts) },
  { key: "campaignCreator", labelKey: "planFeatureCampaignCreator", value: () => true },
  { key: "audienceCreator", labelKey: "planFeatureAudienceCreator", value: () => true },
  { key: "creativeCreator", labelKey: "planFeatureCreativeCreator", value: () => true },
  { key: "adCreator", labelKey: "planFeatureAdCreator", value: () => true },
  { key: "creativeRanking", labelKey: "planFeatureCreativeRanking", value: (l) => l.allowRankingConfig },
  { key: "aiCredits", labelKey: "planFeatureAiCredits", value: (l) => formatLimitValue(l.maxAiRequestsPerMonth) },
  { key: "members", labelKey: "planFeatureMembers", value: (l) => formatLimitValue(l.maxMembers) },
  { key: "persona", labelKey: "planFeaturePersona", value: (l) => l.maxAudiencePersonas !== 0 },
  { key: "cortex", labelKey: "planFeatureCortex", value: (l) => l.allowCreativeMemoryAi },
  {
    key: "copilot",
    labelKey: "planFeatureCopilot",
    value: (l) => {
      if (!l.allowCopilot) return false;
      return l.maxScientists < 0 ? UNLIMITED : `${SCIENTISTS_PREFIX}${l.maxScientists}`;
    }
  },
  { key: "reports", labelKey: "planFeatureReports", value: () => true },
  { key: "reportSchedule", labelKey: "planFeatureReportSchedule", value: (l) => l.maxScheduledReports > 0 },
  { key: "dashboard", labelKey: "planFeatureDashboard", value: () => true }
];

/**
 * Traduz o valor calculado de uma linha. Os sentinelas (`UNLIMITED`,
 * `SCIENTISTS_PREFIX`) existem porque o registry é código puro, sem acesso ao
 * next-intl — quem renderiza é que sabe o idioma.
 */
export function resolvePlanFeatureValue(
  value: MarketingFeatureValue,
  t: (key: string, values?: Record<string, string | number | Date>) => string
): MarketingFeatureValue {
  if (value === UNLIMITED) return t("planFeatureUnlimited");
  if (typeof value === "string" && value.startsWith(SCIENTISTS_PREFIX)) {
    return t("planFeatureScientistsCount", { count: value.slice(SCIENTISTS_PREFIX.length) });
  }
  return value;
}
