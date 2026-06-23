import type { ExternalPrices, PlanLimits } from "@/lib/billing/types";
import { FREE_LIMITS } from "@/lib/billing/types";

/** Preços oficiais Orion (BRL) — fallback quando API ainda não refletiu a migração. */
export const ORION_OFFICIAL_BRL_CENTS: Record<
  string,
  { name: string; monthlyCents: number; yearlyListCents: number }
> = {
  basic: { name: "Individual", monthlyCents: 4990, yearlyListCents: 59880 },
  advanced: { name: "Advanced", monthlyCents: 10990, yearlyListCents: 131880 },
  "advanced-pro": { name: "Advanced Pro", monthlyCents: 15990, yearlyListCents: 191880 },
  agency: { name: "Agency", monthlyCents: 25990, yearlyListCents: 311880 },
  "agency-pro": { name: "Agency Pro", monthlyCents: 49990, yearlyListCents: 599880 }
};

export const MARKETING_PAID_PLAN_SLUGS = [
  "basic",
  "advanced",
  "advanced-pro",
  "agency",
  "agency-pro"
] as const;

export type MarketingPlanSlug = (typeof MARKETING_PAID_PLAN_SLUGS)[number];

export type MarketingPlanRow = {
  id: string;
  slug: string;
  name: string;
  priceMonthlyCents: number;
  priceYearlyCents: number;
  externalPrices?: ExternalPrices | null;
  limits?: PlanLimits;
  description?: string | null;
  trialDays?: number;
};

const PLAN_LIMITS_FALLBACK: Record<string, Partial<PlanLimits>> = {
  basic: {
    maxClients: 5,
    maxAdAccounts: 15,
    maxMembers: 2,
    maxAutomationRules: 5,
    maxAiRequestsPerMonth: 50,
    maxScheduledReports: 2,
    allowAutoSync: true,
    allowLiveMeta: false
  },
  advanced: {
    maxClients: 10,
    maxAdAccounts: 30,
    maxMembers: 5,
    maxAutomationRules: 10,
    maxAiRequestsPerMonth: 100,
    maxScheduledReports: 5,
    allowAutoSync: true,
    allowLiveMeta: true
  },
  "advanced-pro": {
    maxClients: 20,
    maxAdAccounts: 60,
    maxMembers: 8,
    maxAutomationRules: 20,
    maxAiRequestsPerMonth: 200,
    maxScheduledReports: 10,
    allowAutoSync: true,
    allowLiveMeta: true
  },
  agency: {
    maxClients: 50,
    maxAdAccounts: 150,
    maxMembers: 15,
    maxAutomationRules: 50,
    maxAiRequestsPerMonth: 500,
    maxScheduledReports: 20,
    allowAutoSync: true,
    allowLiveMeta: true
  },
  "agency-pro": {
    maxClients: 100,
    maxAdAccounts: 300,
    maxMembers: 25,
    maxAutomationRules: 100,
    maxAiRequestsPerMonth: 1000,
    maxScheduledReports: 50,
    allowAutoSync: true,
    allowLiveMeta: true
  }
};

function fallbackLimits(slug: string): PlanLimits {
  return { ...FREE_LIMITS, ...(PLAN_LIMITS_FALLBACK[slug] ?? {}) };
}

export function mergePlanWithOfficialPricing<T extends MarketingPlanRow>(plan: T): T {
  const official = ORION_OFFICIAL_BRL_CENTS[plan.slug];
  if (!official) return plan;

  const asaas = {
    monthlyCents: official.monthlyCents,
    yearlyCents: official.yearlyListCents
  };

  return {
    ...plan,
    name: official.name,
    priceMonthlyCents: official.monthlyCents,
    priceYearlyCents: official.yearlyListCents,
    externalPrices: {
      ...(plan.externalPrices ?? {}),
      asaas
    }
  };
}

export function buildMarketingPlanFallback(slug: MarketingPlanSlug): MarketingPlanRow {
  const official = ORION_OFFICIAL_BRL_CENTS[slug];
  return {
    id: slug,
    slug,
    name: official.name,
    priceMonthlyCents: official.monthlyCents,
    priceYearlyCents: official.yearlyListCents,
    limits: fallbackLimits(slug),
    externalPrices: {
      asaas: {
        monthlyCents: official.monthlyCents,
        yearlyCents: official.yearlyListCents
      }
    }
  };
}

export function ensureMarketingPaidPlans<T extends MarketingPlanRow>(plans: T[]): T[] {
  const bySlug = new Map(plans.map((p) => [p.slug, mergePlanWithOfficialPricing(p) as T]));
  for (const slug of MARKETING_PAID_PLAN_SLUGS) {
    if (!bySlug.has(slug)) {
      bySlug.set(slug, buildMarketingPlanFallback(slug) as T);
    }
  }
  const order = ["free", ...MARKETING_PAID_PLAN_SLUGS];
  return [...bySlug.values()].sort(
    (a, b) => order.indexOf(a.slug) - order.indexOf(b.slug) || a.slug.localeCompare(b.slug)
  );
}
