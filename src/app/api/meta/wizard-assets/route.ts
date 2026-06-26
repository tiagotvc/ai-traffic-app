import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { runMetaDiscoverForBusiness } from "@/lib/meta-discover";
import { fetchAdAccountPixels } from "@/lib/meta-graph";
import { resolvePagesForAdAccount } from "@/lib/meta-publish-assets";

export const maxDuration = 30;

export async function GET(req: Request) {
  const { tenant, metaAccessToken } = await getAppContext();
  if (!metaAccessToken) {
    return NextResponse.json(
      { ok: false, error: "Meta não conectada. Conecte em Configurações → Meta Ads." },
      { status: 400 }
    );
  }

  const url = new URL(req.url);
  const metaBusinessId = url.searchParams.get("metaBusinessId")?.trim() ?? "";
  const metaBusinessName = url.searchParams.get("metaBusinessName")?.trim() || null;
  const accountIdsParam = url.searchParams.get("metaAdAccountIds")?.trim() ?? "";
  const metaAdAccountIds = accountIdsParam
    ? accountIdsParam.split(",").map((id) => id.trim()).filter(Boolean)
    : [];

  if (!metaBusinessId || metaAdAccountIds.length === 0) {
    return NextResponse.json(
      { ok: false, error: "metaBusinessId e metaAdAccountIds são obrigatórios" },
      { status: 400 }
    );
  }

  try {
    await runMetaDiscoverForBusiness(
      tenant.id,
      metaAccessToken,
      metaBusinessId,
      metaBusinessName
    );
  } catch {
    /* continua com fetch live */
  }

  const primaryAccountId = metaAdAccountIds[0]!;
  const pages = await resolvePagesForAdAccount({
    tenantId: tenant.id,
    adAccountId: primaryAccountId,
    metaAccessToken
  });

  const pixelMap = new Map<string, { id: string; name: string }>();
  for (const act of metaAdAccountIds) {
    const rows = await fetchAdAccountPixels(metaAccessToken, act).catch(() => []);
    for (const p of rows) {
      if (!pixelMap.has(p.id)) {
        pixelMap.set(p.id, { id: p.id, name: p.name?.trim() || p.id });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    pages,
    pixels: [...pixelMap.values()].sort((a, b) => a.name.localeCompare(b.name))
  });
}
