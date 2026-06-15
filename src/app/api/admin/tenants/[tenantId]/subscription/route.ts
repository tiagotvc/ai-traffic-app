import { NextResponse } from "next/server";
import { z } from "zod";

import { updateTenantSubscription } from "@/lib/admin/platform-users";
import { requireBillingAdmin } from "@/lib/billing/admin-auth";

const patchSchema = z.object({
  planSlug: z.string().min(1).optional(),
  status: z.enum(["trialing", "active", "past_due", "suspended", "canceled"]).optional(),
  billingCycle: z.enum(["monthly", "yearly"]).optional(),
  currentPeriodEnd: z.string().datetime().nullable().optional(),
  cancelAtPeriodEnd: z.boolean().optional()
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const gate = await requireBillingAdmin();
  if (!gate.ok) return gate.response;

  try {
    const { tenantId } = await params;
    const body = patchSchema.parse(await req.json());
    const subscription = await updateTenantSubscription(tenantId, body);
    return NextResponse.json({ ok: true, subscription });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error" },
      { status: 400 }
    );
  }
}
