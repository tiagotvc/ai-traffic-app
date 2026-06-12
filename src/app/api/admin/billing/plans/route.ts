import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { requireBillingAdmin } from "@/lib/billing/admin-auth";
import { planToAdminJson } from "@/lib/billing/plan-serializer";

export async function GET() {
  const gate = await requireBillingAdmin();
  if (!gate.ok) return gate.response;

  const { plan: planRepo } = await repositories();
  const plans = await planRepo.find({ order: { sortOrder: "ASC" } });
  return NextResponse.json({ ok: true, plans: plans.map(planToAdminJson) });
}
