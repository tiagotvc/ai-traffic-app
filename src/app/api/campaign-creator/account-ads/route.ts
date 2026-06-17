import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { fetchAdsWithUsageForAccount } from "@/lib/meta-graph";
import { getTenantMetaAccessToken } from "@/lib/meta-auth-store";

export async function GET(req: Request) {
  const { tenant, user, metaAccessToken } = await getAppContext();
  const url = new URL(req.url);
  const clientSlug = url.searchParams.get("clientId")?.trim();
  const adAccountId = url.searchParams.get("adAccountId")?.trim();
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";

  if (!clientSlug || !adAccountId) {
    return NextResponse.json({ ok: false, error: "clientId and adAccountId required" }, { status: 400 });
  }

  const client = await getClientBySlugOrId(tenant.id, clientSlug);
  if (!client) {
    return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
  }

  const { adAccount: adAccountRepo } = await repositories();
  const linked = await adAccountRepo.findOne({
    where: { clientId: client.id, metaAdAccountId: adAccountId }
  });
  if (!linked) {
    return NextResponse.json({ ok: false, error: "Conta não vinculada" }, { status: 403 });
  }

  const token = metaAccessToken ?? (await getTenantMetaAccessToken(tenant.id, user.id));
  if (!token) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  try {
    let ads = await fetchAdsWithUsageForAccount(token, adAccountId);
    if (q) {
      ads = ads.filter((a) => {
        const hay = `${a.name ?? ""} ${a.campaignName ?? ""} ${a.adsetName ?? ""} ${a.id}`.toLowerCase();
        return hay.includes(q);
      });
    }
    ads = ads.slice(0, 80);

    return NextResponse.json({
      ok: true,
      ads: ads.map((a) => ({
        id: a.id,
        name: a.name ?? a.id,
        status: a.status,
        campaignName: a.campaignName,
        adsetName: a.adsetName,
        thumbnailUrl: a.thumbnailUrl ?? a.imageUrl,
        creativeType: a.creativeType
      }))
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao listar anúncios";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
