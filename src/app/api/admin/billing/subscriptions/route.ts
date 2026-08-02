import { NextResponse } from "next/server";

import { requireBillingAdmin } from "@/lib/billing/admin-auth";
import { listActiveSubscriptions } from "@/lib/billing/admin-finance";

export async function GET() {
  const gate = await requireBillingAdmin();
  if (!gate.ok) return gate.response;

  const subscriptions = await listActiveSubscriptions();
  return NextResponse.json({ ok: true, subscriptions });
}
