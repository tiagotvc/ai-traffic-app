import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { requireBillingAdmin } from "@/lib/billing/admin-auth";

const patchSchema = z.object({
  percentOff: z.number().int().min(1).max(100).optional(),
  maxUses: z.number().int().min(1).nullable().optional(),
  isActive: z.boolean().optional(),
  validFrom: z.string().datetime().nullable().optional(),
  validUntil: z.string().datetime().nullable().optional(),
  allowedPlanSlugs: z.array(z.string()).nullable().optional(),
  minChargeCents: z.number().int().min(500).optional(),
  description: z.string().nullable().optional()
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireBillingAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const body = patchSchema.parse(await req.json());
  const { discountCoupon: repo } = await repositories();
  const row = await repo.findOne({ where: { id } });
  if (!row) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  if (body.percentOff != null) row.percentOff = body.percentOff;
  if (body.maxUses !== undefined) row.maxUses = body.maxUses;
  if (body.isActive != null) row.isActive = body.isActive;
  if (body.validFrom !== undefined) row.validFrom = body.validFrom ? new Date(body.validFrom) : null;
  if (body.validUntil !== undefined) row.validUntil = body.validUntil ? new Date(body.validUntil) : null;
  if (body.allowedPlanSlugs !== undefined) row.allowedPlanSlugs = body.allowedPlanSlugs;
  if (body.minChargeCents != null) row.minChargeCents = body.minChargeCents;
  if (body.description !== undefined) row.description = body.description;

  await repo.save(row);
  return NextResponse.json({ ok: true, coupon: row });
}
