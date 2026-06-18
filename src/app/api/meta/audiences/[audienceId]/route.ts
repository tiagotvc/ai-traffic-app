import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { fetchCustomAudienceDetail } from "@/lib/meta-graph";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ audienceId: string }> }
) {
  const { metaAccessToken } = await getAppContext();
  if (!metaAccessToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const { audienceId } = await ctx.params;
  const url = new URL(req.url);
  const clientSlug = url.searchParams.get("clientId")?.trim() ?? "";
  const adAccountId = url.searchParams.get("adAccountId")?.trim() ?? "";

  if (clientSlug && adAccountId) {
    const { tenant } = await getAppContext();
    const client = await getClientBySlugOrId(tenant.id, clientSlug);
    if (!client) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
    }
    const { adAccount: adAccountRepo } = await repositories();
    const linked = await adAccountRepo.findOne({
      where: { clientId: client.id, metaAdAccountId: adAccountId }
    });
    if (!linked) {
      return NextResponse.json(
        { ok: false, error: "Conta não vinculada ao cliente" },
        { status: 403 }
      );
    }
  }

  try {
    const audience = await fetchCustomAudienceDetail(metaAccessToken, audienceId);
    return NextResponse.json({ ok: true, audience });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao buscar público na Meta";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
