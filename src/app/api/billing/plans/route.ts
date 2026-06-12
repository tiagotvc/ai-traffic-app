import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAvailableProviders } from "@/lib/billing/providers";

export async function GET() {
  const { plan: planRepo } = await repositories();
  const plans = await planRepo.find({
    where: { isActive: true },
    order: { sortOrder: "ASC" }
  });
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
      limits: p.limits,
      externalPrices: p.externalPrices
    })),
    providers: getAvailableProviders()
  });
}
