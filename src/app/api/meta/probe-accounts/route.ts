import { NextResponse } from "next/server";

import { In } from "typeorm";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";
import { getAllTenantMetaTokens } from "@/lib/meta-auth-store";
import { probeAdAccountAccessAnyToken } from "@/lib/creatives-data";

export async function GET() {
  const { tenant, metaAccessToken: ctxToken } = await getAppContext();
  const tokens = await getAllTenantMetaTokens(tenant.id, ctxToken);
  const { adAccount: adAccountRepo, client: clientRepo } = await repositories();

  const clients = await clientRepo.find({ where: { tenantId: tenant.id } });
  const clientIds = clients.map((c) => c.id);
  const linked = clientIds.length
    ? await adAccountRepo.find({ where: { clientId: In(clientIds) } })
    : [];

  const seen = new Set<string>();
  const results: Array<{ account: string; label: string; ok: boolean; reason: string | null }> = [];

  for (const acc of linked) {
    if (seen.has(acc.metaAdAccountId)) continue;
    seen.add(acc.metaAdAccountId);
    const probe = await probeAdAccountAccessAnyToken(tokens, acc.metaAdAccountId);
    results.push({
      account: acc.metaAdAccountId,
      label: acc.label ?? acc.metaAdAccountId,
      ok: probe.ok,
      reason: probe.reason
    });
  }

  return NextResponse.json({ ok: true, accounts: results });
}
