import { NextResponse } from "next/server";

import { requireBillingAdmin } from "@/lib/billing/admin-auth";
import { listFinanceInvoices } from "@/lib/billing/admin-finance";
import type { PaymentProvider } from "@/lib/billing/types";

export async function GET(req: Request) {
  const gate = await requireBillingAdmin();
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const provider = url.searchParams.get("provider") as PaymentProvider | null;
  const limit = Number(url.searchParams.get("limit") ?? 50);

  const invoices = await listFinanceInvoices({
    provider: provider === "asaas" || provider === "stripe" ? provider : undefined,
    limit
  });

  return NextResponse.json({ ok: true, invoices });
}
