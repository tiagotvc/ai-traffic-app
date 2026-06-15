import { NextResponse } from "next/server";

import { requireBillingAdmin } from "@/lib/billing/admin-auth";
import { getFinanceSummary } from "@/lib/billing/admin-finance";

export async function GET(req: Request) {
  const gate = await requireBillingAdmin();
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  const filter = {
    from: fromParam ? new Date(fromParam) : undefined,
    to: toParam ? new Date(toParam) : undefined
  };

  const summary = await getFinanceSummary(filter);
  return NextResponse.json({ ok: true, ...summary });
}
