import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { listMetaAdAccountOptions } from "@/lib/meta-ad-accounts";

export async function GET(req: Request) {
  try {
    const { tenant, metaAccessToken } = await getAppContext();
    const url = new URL(req.url);
    const clientIdParam = url.searchParams.get("clientId");

    let _clientId: string | undefined;
    if (clientIdParam) {
      const client = await getClientBySlugOrId(tenant.id, clientIdParam);
      if (!client) {
        return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
      }
      _clientId = client.id;
    }

    const accounts = await listMetaAdAccountOptions({
      tenantId: tenant.id,
      metaAccessToken,
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
