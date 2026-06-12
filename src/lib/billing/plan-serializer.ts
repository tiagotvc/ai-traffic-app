import type { Plan } from "@/db/entities/Plan";

export function planToAdminJson(plan: Plan) {
  return {
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    description: plan.description,
    priceMonthlyCents: plan.priceMonthlyCents,
    priceYearlyCents: plan.priceYearlyCents,
    trialDays: plan.trialDays,
    sortOrder: plan.sortOrder,
    isActive: plan.isActive,
    currency: plan.currency,
    limits: plan.limits,
    externalPrices: plan.externalPrices ?? null,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt
  };
}
