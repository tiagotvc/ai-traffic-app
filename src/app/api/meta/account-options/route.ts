import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { listMetaAdAccountOptions } from "@/lib/meta-ad-accounts";
import { fetchMyAdAccountsSpendLast30d } from "@/lib/meta-graph";

// Pode fazer descoberta live + 1 chamada de insights — dá folga.
export const maxDuration = 30;

export async function GET(req: Request) {
  const { tenant, metaAccessToken } = await getAppContext();
  const metaBusinessId = new URL(req.url).searchParams.get("metaBusinessId") || undefined;

  // Escopo pela BM selecionada (mantém a regra: só as contas daquela BM).
  const options = await listMetaAdAccountOptions({
    tenantId: tenant.id,
    metaBusinessId,
    metaAccessToken,
    hideDemoWhenRealExists: true
  });

  let spendMap = new Map<string, number>();
  if (metaAccessToken) {
    try {
      spendMap = await fetchMyAdAccountsSpendLast30d(metaAccessToken);
    } catch {
      spendMap = new Map();
    }
  }

  const accounts = options.map((o) => ({
    metaAdAccountId: o.metaAdAccountId,
    label: o.label,
    metaBusinessId: o.metaBusinessId ?? null,
    metaBusinessName: o.metaBusinessName ?? null,
    spendLast30d: spendMap.get(o.metaAdAccountId) ?? null
  }));

  return NextResponse.json({ ok: true, accounts });
}
