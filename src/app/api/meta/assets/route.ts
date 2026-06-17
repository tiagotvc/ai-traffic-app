import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { getInventoryMap } from "@/lib/meta-ad-accounts";
import { listTenantInventory, listTenantPages } from "@/lib/meta-discover";
import {
  fetchAdAccountPixels,
  fetchAdImages,
  fetchInstagramAccountsForAdAccount
} from "@/lib/meta-graph";

async function validateClientAdAccount(
  tenantId: string,
  clientSlug: string,
  adAccountId: string
): Promise<{ ok: true; clientId: string } | { ok: false; error: string; status: number }> {
  const client = await getClientBySlugOrId(tenantId, clientSlug);
  if (!client) return { ok: false, error: "Cliente não encontrado", status: 404 };

  const { adAccount: adAccountRepo } = await repositories();
  const linked = await adAccountRepo.findOne({
    where: { clientId: client.id, metaAdAccountId: adAccountId }
  });
  if (!linked) {
    return { ok: false, error: "Conta não vinculada ao cliente", status: 403 };
  }
  return { ok: true, clientId: client.id };
}

export async function GET(req: Request) {
  const { tenant, metaAccessToken } = await getAppContext();
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId")?.trim();
  const adAccountId = url.searchParams.get("adAccountId")?.trim();

  if (!clientId || !adAccountId) {
    return NextResponse.json(
      { ok: false, error: "clientId e adAccountId são obrigatórios" },
      { status: 400 }
    );
  }

  const validation = await validateClientAdAccount(tenant.id, clientId, adAccountId);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: validation.status });
  }

  const inv = await getInventoryMap(tenant.id);
  const bmFilter = inv.get(adAccountId)?.metaBusinessId ?? undefined;

  const adAccounts = await listTenantInventory(tenant.id, bmFilter);
  const pageRows = await listTenantPages(tenant.id, bmFilter);
  const pages = pageRows.map((p) => ({ metaPageId: p.metaPageId, name: p.name }));

  let pixels: Array<{ id: string; name: string }> = [];
  let instagramAccounts: Array<{ id: string; username: string }> = [];
  let assets: Array<{ id: string; label: string; url?: string | null }> = [];

  if (metaAccessToken) {
    const [pixelRows, igRows, imageRows] = await Promise.all([
      fetchAdAccountPixels(metaAccessToken, adAccountId),
      fetchInstagramAccountsForAdAccount(metaAccessToken, adAccountId),
      fetchAdImages(metaAccessToken, adAccountId)
    ]);
    pixels = pixelRows.map((p) => ({ id: p.id, name: p.name?.trim() || p.id }));
    instagramAccounts = igRows.map((i) => ({ id: i.id, username: i.username?.trim() || i.id }));
    assets = imageRows
      .filter((img) => !!img.hash)
      .map((img) => ({
        id: img.hash as string,
        label: img.name?.trim() || (img.hash as string),
        url: img.url ?? null
      }));
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
