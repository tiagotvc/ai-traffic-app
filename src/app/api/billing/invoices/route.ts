import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { repositories } from "@/db/repositories";

export async function GET() {
  const { tenant } = await getAppContext();
  const { invoice: invRepo, billingEvent: evRepo } = await repositories();
  const invoices = await invRepo.find({
    where: { tenantId: tenant.id },
    order: { createdAt: "DESC" },
    take: 50
  });
  const events = await evRepo.find({
    where: { tenantId: tenant.id },
    order: { createdAt: "DESC" },
    take: 50
  });
  return NextResponse.json({ ok: true, invoices, events });
}
