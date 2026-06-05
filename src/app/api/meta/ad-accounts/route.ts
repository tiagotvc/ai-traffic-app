import { NextResponse } from "next/server";
import { In } from "typeorm";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";

export async function GET(req: Request) {
  try {
    const { tenant } = await getAppContext();
    const url = new URL(req.url);
    const clientIdParam = url.searchParams.get("clientId");

    const { client: clientRepo, adAccount: adAccountRepo } = await repositories();

    // Com cliente: SOMENTE as contas vinculadas a ele (lidas do banco — não depende
    // do token Meta, então funciona mesmo com token expirado).
    if (clientIdParam) {
      const client = await getClientBySlugOrId(tenant.id, clientIdParam);
      if (!client) {
        return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
      }
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

    // Sem cliente: SOMENTE as contas designadas a clientes cadastrados na plataforma.
    // Nunca lista todas as contas do Meta — contas que só existem na Meta (sem cliente
    // vinculado) não aparecem como opção (ex.: no criador de anúncios).
    const clients = await clientRepo.find({ where: { tenantId: tenant.id } });
    const clientIds = clients.map((c) => c.id);
    const linked = clientIds.length
      ? await adAccountRepo.find({ where: { clientId: In(clientIds) } })
      : [];
    const seen = new Set<string>();
    const accounts: Array<{ metaAdAccountId: string; label: string; metaBusinessId: string | null }> = [];
    for (const a of linked) {
      if (seen.has(a.metaAdAccountId)) continue;
      seen.add(a.metaAdAccountId);
      accounts.push({
        metaAdAccountId: a.metaAdAccountId,
        label: a.label ?? a.metaAdAccountId,
        metaBusinessId: a.metaBusinessId ?? null
      });
    }

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
