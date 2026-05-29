import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { listTenantInventory, listTenantPages } from "@/lib/meta-discover";

export async function GET(req: Request) {
  const { tenant } = await getAppContext();
  const url = new URL(req.url);
  const businessId = url.searchParams.get("businessId");

  const adAccounts = await listTenantInventory(
    tenant.id,
    businessId === "unassigned" ? "unassigned" : businessId || undefined
  );
  const pages = await listTenantPages(
    tenant.id,
    businessId === "unassigned" ? "unassigned" : businessId || undefined
  );

  return NextResponse.json({ ok: true, adAccounts, pages });
}
