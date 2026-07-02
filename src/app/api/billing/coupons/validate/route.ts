import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { getAppContext } from "@/lib/app-context";
import { validateCouponForCheckout } from "@/lib/billing/coupons";
import { planListCents, resolvePlanMonthlyCents } from "@/lib/billing/currency";
import { calculateCheckoutPricing } from "@/lib/billing/pricing";
import { repositories } from "@/db/repositories";

const bodySchema = z.object({
  code: z.string().min(1),
  planId: z.string().uuid(),
  cycle: z.enum(["monthly", "yearly"]),
  billingType: z.enum(["PIX", "CREDIT_CARD"]).optional(),
  installmentCount: z.number().int().min(1).max(12).optional()
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    // Checkout público: preview de cupom antes da conta existir não checa "já usado" (ver
    // validateCouponForCheckout) — a validação final roda de novo no submit com o tenantId real.
    const tenantId = session?.user?.email ? (await getAppContext()).tenant.id : undefined;
    const body = bodySchema.parse(await req.json());
    const { plan: planRepo } = await repositories();
    const plan = await planRepo.findOne({ where: { id: body.planId, isActive: true } });
    if (!plan || plan.slug === "free") {
      return NextResponse.json({ ok: false, error: "Invalid plan" }, { status: 400 });
    }

    const billingType = body.billingType ?? "PIX";
    const pricing = calculateCheckoutPricing({
      priceMonthlyCents: resolvePlanMonthlyCents(plan, "BRL"),
      listCents: planListCents(plan, body.cycle, "BRL"),
      cycle: body.cycle,
      provider: "asaas",
      billingType,
      installmentCount: body.installmentCount
    });

    const result = await validateCouponForCheckout({
      code: body.code,
      tenantId,
      plan,
      pricing
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      pricing: result.pricing,
      discountCents: result.discountCents,
      finalCents: result.finalCents,
      code: result.coupon.code,
      percentOff: result.coupon.percentOff
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error" },
      { status: 400 }
    );
  }
}
