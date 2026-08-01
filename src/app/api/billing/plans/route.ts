import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { resolveLimits } from "@/lib/billing/resolve-limits";
import { getAvailableProviders } from "@/lib/billing/providers";

export async function GET() {
  const { plan: planRepo, planFeatureVisibility: visibilityRepo } = await repositories();
  const [plans, featureVisibility] = await Promise.all([
    planRepo.find({ where: { isActive: true }, order: { sortOrder: "ASC" } }),
    visibilityRepo.find({ order: { sortOrder: "ASC" } })
  ]);
  return NextResponse.json({
    ok: true,
    plans: plans.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      priceMonthlyCents: p.priceMonthlyCents,
      priceYearlyCents: p.priceYearlyCents,
      trialDays: p.trialDays,
      currency: p.currency,
      limits: resolveLimits(p),
      externalPrices: p.externalPrices
    })),
    featureVisibility: featureVisibility.map((v) => ({
      featureKey: v.featureKey,
      showCompact: v.showCompact,
      showFull: v.showFull,
      sortOrder: v.sortOrder
    })),
    providers: getAvailableProviders()
  });
}
