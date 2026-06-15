import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { getAllTenantMetaTokens } from "@/lib/meta-auth-store";
import { fetchAllAccessibleAdAccounts } from "@/lib/meta-graph";

export const maxDuration = 60;

/**
 * Diagnóstico: lista, por token Meta conectado no workspace, TODAS as contas de
 * anúncio que aquele token enxerga (com status e BM). Use ?accountId=act_XXXX
 * para checar se a conta-alvo aparece em algum token.
 *
 * Não expõe o valor dos tokens — só o índice. Somente leitura.
 */
export async function GET(req: Request) {
  let ctx;
  try {
    ctx = await getAppContext();
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { tenant, metaAccessToken } = ctx;
  const url = new URL(req.url);
  const target = url.searchParams.get("accountId");

  const tokens = await getAllTenantMetaTokens(tenant.id, metaAccessToken);

  const perToken = await Promise.all(
    tokens.map(async (token, index) => {
      try {
        const map = await fetchAllAccessibleAdAccounts(token);
        const accounts = [...map.values()].map((a) => ({
          id: a.id,
          name: a.name ?? null,
          status: a.account_status ?? null,
          businessId: a.metaBusinessId ?? null,
          businessName: a.metaBusinessName ?? null
        }));
        return {
          tokenIndex: index,
          accountCount: accounts.length,
          hasTarget: target ? accounts.some((a) => a.id === target) : null,
          accounts: accounts.sort((x, y) => (x.name ?? "").localeCompare(y.name ?? ""))
        };
      } catch (e) {
        return {
          tokenIndex: index,
          error: e instanceof Error ? e.message : String(e)
        };
      }
    })
  );

  const targetFoundInAnyToken = target
    ? perToken.some((t) => "hasTarget" in t && t.hasTarget === true)
    : null;

  return NextResponse.json({
    ok: true,
    tokenCount: tokens.length,
    target,
    targetFoundInAnyToken,
    perToken
  });
}
