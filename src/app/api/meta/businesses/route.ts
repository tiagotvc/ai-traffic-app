import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { listTenantBusinessesWithCounts, listTenantInventory, listTenantPages } from "@/lib/meta-discover";

export async function GET() {
  const { tenant } = await getAppContext();
  const businesses = await listTenantBusinessesWithCounts(tenant.id);
  const adAccounts = await listTenantInventory(tenant.id);
  const pages = await listTenantPages(tenant.id);

  return NextResponse.json({
    ok: true,
    businesses,
    totals: {
      businesses: businesses.length,
      adAccounts: adAccounts.length,
      pages: pages.length
    }
  });
}
