import type { ExternalPrices, PlanLimits } from "@/lib/billing/types";
import { AGENCY_LIMITS, ADVANCED_LIMITS, BASIC_LIMITS } from "@/lib/billing/types";

/**
 * Preços oficiais Orion (BRL) — fallback quando a API ainda não refletiu a migração.
 *
 * Precisa acompanhar a tabela `plans`: enquanto estes valores estavam defasados
 * (49,90/109,90/259,90), a vitrine mostrava preço menor que o cobrado sempre que a
 * API demorava. Fonte da verdade: migração `0075-PlanPriceIncrease`.
 */
export const ORION_OFFICIAL_BRL_CENTS: Record<
  string,
  { name: string; monthlyCents: number; yearlyListCents: number }
> = {
  basic: { name: "Individual", monthlyCents: 5990, yearlyListCents: 71880 },
  advanced: { name: "Advanced", monthlyCents: 13990, yearlyListCents: 167880 },
  agency: { name: "Agency", monthlyCents: 37990, yearlyListCents: 455880 }
};

export const MARKETING_PAID_PLAN_SLUGS = ["basic", "advanced", "agency"] as const;

/** Planos exibidos na landing, comparativo de stack e vitrine de marketing. */
export const MARKETING_VITRINE_SLUGS = ["basic", "advanced", "agency"] as const;

export type MarketingPlanSlug = (typeof MARKETING_PAID_PLAN_SLUGS)[number];
export type MarketingVitrineSlug = (typeof MARKETING_VITRINE_SLUGS)[number];

export type MarketingPlanRow = {
  id: string;
  slug: string;
  name: string;
  priceMonthlyCents: number;
  priceYearlyCents: number;
  /** Moeda em que o plano é cobrado — os pagos são sempre BRL (Asaas). */
  currency?: string;
  externalPrices?: ExternalPrices | null;
  limits?: PlanLimits;
  description?: string | null;
  trialDays?: number;
};

/** Referência canônica de limites por plano (types.ts) — usada só como fallback de
 * emergência (API fora do ar), nunca sobrepõe o que vem do DB. */
const PLAN_LIMITS_FALLBACK: Record<MarketingPlanSlug, PlanLimits> = {
  basic: BASIC_LIMITS,
  advanced: ADVANCED_LIMITS,
  agency: AGENCY_LIMITS
};

function fallbackLimits(slug: MarketingPlanSlug): PlanLimits {
  return PLAN_LIMITS_FALLBACK[slug];
}

export function buildMarketingPlanFallback(slug: MarketingPlanSlug): MarketingPlanRow {
  const official = ORION_OFFICIAL_BRL_CENTS[slug];
  return {
    id: slug,
    slug,
    name: official.name,
    priceMonthlyCents: official.monthlyCents,
    priceYearlyCents: official.yearlyListCents,
    // Sem isto a vitrine em inglês trocava só o símbolo e exibia "$59.90".
    currency: "BRL",
    limits: fallbackLimits(slug),
    externalPrices: {
      asaas: {
        monthlyCents: official.monthlyCents,
        yearlyCents: official.yearlyListCents
      }
    }
  };
}

/** Resolve os 3 planos da vitrine (Individual, Advanced, Agency) com fallback oficial. */
export function resolveMarketingVitrinePlans<T extends MarketingPlanRow>(plans: T[]): T[] {
  const bySlug = new Map(plans.map((p) => [p.slug, p]));
  return MARKETING_VITRINE_SLUGS.map((slug) => {
    const fromApi = bySlug.get(slug);
    if (fromApi) return fromApi;
    return buildMarketingPlanFallback(slug) as T;
  });
}
