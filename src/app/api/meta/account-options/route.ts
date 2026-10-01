import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { listMetaAdAccountOptions } from "@/lib/meta-ad-accounts";
import { fetchMyAdAccountsSpendLast30d } from "@/lib/meta-graph";

// Pode fazer descoberta live + 1 chamada de insights — dá folga.
export const maxDuration = 30;

const SPEND_TIMEOUT_MS = 8000;

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

  // Gasto é só informativo e varre todas as contas do usuário: não pode
  // segurar a lista. Passou do prazo, a lista sai sem o gasto.
  let spendMap = new Map<string, number>();
  if (metaAccessToken && options.length) {
    spendMap = await Promise.race([
      fetchMyAdAccountsSpendLast30d(metaAccessToken).catch(() => new Map<string, number>()),
      new Promise<Map<string, number>>((resolve) =>
        setTimeout(() => resolve(new Map()), SPEND_TIMEOUT_MS)
      )
    ]);
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
