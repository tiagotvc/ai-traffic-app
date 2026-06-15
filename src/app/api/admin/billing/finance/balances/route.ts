import { NextResponse } from "next/server";

import { requireBillingAdmin } from "@/lib/billing/admin-auth";
import { getProviderBalances } from "@/lib/billing/admin-finance";

export async function GET() {
  const gate = await requireBillingAdmin();
  if (!gate.ok) return gate.response;

  const balances = await getProviderBalances();
  return NextResponse.json({ ok: true, ...balances });
}
