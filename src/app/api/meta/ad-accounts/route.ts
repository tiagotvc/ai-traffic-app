import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { listMetaAdAccountOptions } from "@/lib/meta-ad-accounts";
import { getTenantMetaAccessToken } from "@/lib/meta-auth-store";

export async function GET(req: Request) {
  try {
    const { tenant, user, metaAccessToken } = await getAppContext();
    const url = new URL(req.url);
    const clientIdParam = url.searchParams.get("clientId");

    // Com cliente: retorna SOMENTE as contas vinculadas a ele (as que o usuário
    // escolheu na configuração), lidas do banco — NÃO depende do token do Meta
    // (assim o seletor funciona mesmo com token expirado).
    if (clientIdParam) {
      const client = await getClientBySlugOrId(tenant.id, clientIdParam);
      if (!client) {
        return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
      }
      const { adAccount: adAccountRepo } = await repositories();
      const linked = await adAccountRepo.find({ where: { clientId: client.id } });
      const accounts = linked.map((a) => ({
        metaAdAccountId: a.metaAdAccountId,
        label: a.label ?? a.metaAdAccountId,
        metaBusinessId: a.metaBusinessId ?? null
      }));
      return NextResponse.json({
        ok: true,
        accounts,
        defaultAdAccountId: accounts[0]?.metaAdAccountId ?? null
      });
    }

    // Sem cliente (uso genérico): lista por inventário/BM (usa o token, se houver).
    const tenantToken = await getTenantMetaAccessToken(tenant.id, user.id);
    const tokenForMeta = metaAccessToken ?? tenantToken;
    const accounts = await listMetaAdAccountOptions({
      tenantId: tenant.id,
      metaAccessToken: tokenForMeta,
      hideDemoWhenRealExists: true
    });

    return NextResponse.json({
      ok: true,
      accounts,
      defaultAdAccountId: accounts[0]?.metaAdAccountId ?? null
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load ad accounts";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
