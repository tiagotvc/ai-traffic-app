import type { PlanLimits } from "./types";

/** Ordem de exibição dos 3 planos pagos (checkout, comparativo e landing). */
export const COMPARISON_PLAN_SLUG_ORDER = ["basic", "advanced", "agency"];

export type MarketingFeatureValue = number | boolean | string;

export function formatLimitValue(value: number): string {
  return value < 0 ? "Ilimitado" : String(value);
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
  label: string;
  /** Computa o valor de exibição ao vivo a partir do PlanLimits resolvido do DB. */
  value: (limits: PlanLimits) => MarketingFeatureValue;
};

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
  { key: "clients", label: "Clientes", value: (l) => formatLimitValue(l.maxClients) },
  { key: "adAccounts", label: "Contas de anúncios", value: (l) => formatLimitValue(l.maxAdAccounts) },
  { key: "campaignCreator", label: "Criador e editor de campanhas", value: () => true },
  { key: "audienceCreator", label: "Criador e editor de públicos", value: () => true },
  { key: "creativeCreator", label: "Criador e editor de criativos", value: () => true },
  { key: "adCreator", label: "Criador e editor de anúncios", value: () => true },
  { key: "creativeRanking", label: "Ranking de Criativos", value: (l) => l.allowRankingConfig },
  { key: "aiCredits", label: "Créditos Orion (IA) / mês", value: (l) => formatLimitValue(l.maxAiRequestsPerMonth) },
  { key: "members", label: "Usuários por workspace", value: (l) => formatLimitValue(l.maxMembers) },
  { key: "persona", label: "Orion Persona®", value: (l) => l.maxAudiencePersonas !== 0 },
  { key: "cortex", label: "Orion Cortex", value: (l) => l.allowCreativeMemoryAi },
  { key: "commanderChat", label: "Commander — Chat", value: (l) => l.allowCommander },
  {
    key: "copilot",
    label: "Commander — Scientists",
    value: (l) => {
      if (!l.allowCopilot) return false;
      return l.maxScientists < 0 ? "Ilimitado" : `${l.maxScientists} Scientists`;
    }
  },
  { key: "reports", label: "Relatório", value: () => true },
  { key: "reportSchedule", label: "Agenda (agendamento de relatório)", value: (l) => l.maxScheduledReports > 0 },
  { key: "dashboard", label: "Painel de métricas", value: () => true }
];
