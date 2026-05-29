import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { listTenantInventory, listTenantPages } from "@/lib/meta-discover";
import { fetchAdAccountPixels } from "@/lib/meta-graph";

export async function GET(req: Request) {
  const { tenant, metaAccessToken } = await getAppContext();
  const url = new URL(req.url);
  const businessId = url.searchParams.get("businessId");
  const adAccountId = url.searchParams.get("adAccountId");

  const bmFilter =
    businessId === "unassigned" ? "unassigned" : businessId || undefined;

  const adAccounts = await listTenantInventory(tenant.id, bmFilter);
  const pageRows = await listTenantPages(tenant.id, bmFilter);
  const pages = pageRows.map((p) => ({
    metaPageId: p.metaPageId,
    name: p.name
  }));

  let pixels: Array<{ id: string; name: string }> = [];
  if (adAccountId && metaAccessToken) {
    const rows = await fetchAdAccountPixels(metaAccessToken, adAccountId);
    pixels = rows.map((p) => ({ id: p.id, name: p.name?.trim() || p.id }));
  }

  return NextResponse.json({ ok: true, adAccounts, pages, pixels });
}
