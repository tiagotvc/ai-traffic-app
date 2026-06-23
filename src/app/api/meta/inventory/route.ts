import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { listTenantInventory, listTenantPages } from "@/lib/meta-discover";

/** Inventário local (BM / contas / páginas) para o hub Ativos Meta. */
export async function GET(req: Request) {
  const { tenant } = await getAppContext();
  const businessId = new URL(req.url).searchParams.get("businessId");
  const filter =
    businessId === null || businessId === "" ? undefined : businessId;

  const [accounts, pages] = await Promise.all([
    listTenantInventory(tenant.id, filter),
    listTenantPages(tenant.id, filter)
  ]);

  return NextResponse.json({
    ok: true,
    adAccounts: accounts.map((a) => ({
      metaAdAccountId: a.metaAdAccountId,
      label: a.label,
      metaBusinessId: a.metaBusinessId,
      isDemo: a.isDemo
    })),
    pages: pages.map((p) => ({
      metaPageId: p.metaPageId,
      name: p.name ?? p.metaPageId
    }))
  });
}
