import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { getTenantMetaAccessToken } from "@/lib/meta-auth-store";
import {
  fetchMyAdAccounts,
  fetchMyBusinesses,
  fetchMyBusinessUsers
} from "@/lib/meta-graph";

/**
 * Diagnóstico temporário: mostra exatamente o que o token Meta consegue ver.
 * Útil para entender por que contas aparecem como "Sem BM (acesso direto)".
 * Não retorna o access token. Pode ser removido depois de diagnosticar.
 */
export async function GET() {
  const { tenant, user, metaAccessToken } = await getAppContext();
  const tenantToken = await getTenantMetaAccessToken(tenant.id, user.id);
  const token = metaAccessToken ?? tenantToken;

  if (!token) {
    return NextResponse.json({ ok: false, error: "Sem token Meta conectado" }, { status: 400 });
  }

  const safe = async <T>(label: string, fn: () => Promise<T>) => {
    try {
      return { ok: true, data: await fn() };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e), label };
    }
  };

  const [adAccounts, businesses, businessUsers] = await Promise.all([
    safe("me/adaccounts", () => fetchMyAdAccounts(token)),
    safe("me/businesses", () => fetchMyBusinesses(token)),
    safe("me/business_users", () => fetchMyBusinessUsers(token))
  ]);

  // Resumo das contas: id, nome e o BM que o Meta atribui (business) — o ponto-chave.
  const accountsSummary =
    adAccounts.ok && Array.isArray(adAccounts.data)
      ? adAccounts.data.map((a) => ({
          id: a.id,
          name: a.name ?? null,
          account_status: a.account_status ?? null,
          business: a.business ?? null
        }))
      : adAccounts;

  return NextResponse.json({
    ok: true,
    tenantId: tenant.id,
    counts: {
      adAccounts: adAccounts.ok && Array.isArray(adAccounts.data) ? adAccounts.data.length : null,
      businesses: businesses.ok && Array.isArray(businesses.data) ? businesses.data.length : null,
      businessUsers:
        businessUsers.ok && Array.isArray(businessUsers.data) ? businessUsers.data.length : null
    },
    adAccounts: accountsSummary,
    businesses: businesses.ok ? businesses.data : businesses,
    businessUsers: businessUsers.ok ? businessUsers.data : businessUsers
  });
}
