import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { requireBillingAdmin } from "@/lib/billing/admin-auth";

export async function GET() {
  const auth = await requireBillingAdmin();
  if (!auth.ok) return auth.response;

  const { discountCoupon: repo } = await repositories();
  const coupons = await repo.find({ order: { createdAt: "DESC" } });
  return NextResponse.json({ ok: true, coupons });
}

const createSchema = z.object({
  code: z.string().min(2).max(32),
  percentOff: z.number().int().min(1).max(100),
  maxUses: z.number().int().min(1).nullable().optional(),
  isActive: z.boolean().optional(),
  validFrom: z.string().datetime().nullable().optional(),
  validUntil: z.string().datetime().nullable().optional(),
  allowedPlanSlugs: z.array(z.string()).nullable().optional(),
  minChargeCents: z.number().int().min(500).optional(),
  description: z.string().nullable().optional()
});

export async function POST(req: Request) {
  const auth = await requireBillingAdmin();
  if (!auth.ok) return auth.response;

  const body = createSchema.parse(await req.json());
  const { discountCoupon: repo } = await repositories();

  const existing = await repo.findOne({ where: { code: body.code.trim().toUpperCase() } });
  if (existing) {
    return NextResponse.json({ ok: false, error: "Code already exists" }, { status: 400 });
  }

  const row = await repo.save(
    repo.create({
      code: body.code.trim().toUpperCase(),
      percentOff: body.percentOff,
      maxUses: body.maxUses ?? null,
      isActive: body.isActive ?? true,
      validFrom: body.validFrom ? new Date(body.validFrom) : null,
      validUntil: body.validUntil ? new Date(body.validUntil) : null,
      allowedPlanSlugs: body.allowedPlanSlugs ?? null,
      minChargeCents: body.minChargeCents ?? 500,
      description: body.description ?? null,
      usedCount: 0
    })
  );

  return NextResponse.json({ ok: true, coupon: row });
}
