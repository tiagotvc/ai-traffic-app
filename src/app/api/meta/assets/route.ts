import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { getInventoryMap } from "@/lib/meta-ad-accounts";
import { listTenantInventory, listTenantPages } from "@/lib/meta-discover";
import {
  fetchAdAccountPixels,
  fetchAdImages,
  fetchInstagramAccountsForAdAccount
} from "@/lib/meta-graph";

export async function GET(req: Request) {
  const { tenant, metaAccessToken } = await getAppContext();
  const url = new URL(req.url);
  const businessId = url.searchParams.get("businessId");
  const adAccountId = url.searchParams.get("adAccountId");

  // Quando uma conta é informada, escopa as páginas ao BM dessa conta.
  let bmFilter: string | undefined;
  if (adAccountId) {
    const inv = await getInventoryMap(tenant.id);
    bmFilter = inv.get(adAccountId)?.metaBusinessId ?? undefined;
  } else if (businessId) {
    bmFilter = businessId === "unassigned" ? "unassigned" : businessId;
  }

  const adAccounts = await listTenantInventory(tenant.id, bmFilter);
  const pageRows = await listTenantPages(tenant.id, bmFilter);
  const pages = pageRows.map((p) => ({ metaPageId: p.metaPageId, name: p.name }));

  // Ativos específicos da conta de anúncio escolhida (criação de anúncio).
  let pixels: Array<{ id: string; name: string }> = [];
  let instagramAccounts: Array<{ id: string; username: string }> = [];
  let assets: Array<{ id: string; label: string; url?: string | null }> = [];

  if (adAccountId && metaAccessToken) {
    const [pixelRows, igRows, imageRows] = await Promise.all([
      fetchAdAccountPixels(metaAccessToken, adAccountId),
      fetchInstagramAccountsForAdAccount(metaAccessToken, adAccountId),
      fetchAdImages(metaAccessToken, adAccountId)
    ]);
    pixels = pixelRows.map((p) => ({ id: p.id, name: p.name?.trim() || p.id }));
    instagramAccounts = igRows.map((i) => ({ id: i.id, username: i.username?.trim() || i.id }));
    assets = imageRows
      .filter((img) => !!img.hash)
      .map((img) => ({ id: img.hash as string, label: img.name?.trim() || (img.hash as string), url: img.url ?? null }));
  }

  return NextResponse.json({
    ok: true,
    adAccounts,
    pages,
    pixels,
    instagramAccounts,
    assets
  });
}
