import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext, slugify } from "@/lib/app-context";
import {
  getMetaConnectionInfo,
  getTenantMetaAccessToken,
  resolveWorkspaceMetaAccessToken
} from "@/lib/meta-auth-store";
import {
  fetchCampaigns,
  fetchMyAdAccounts,
  fetchMyBusinesses,
  fetchMyPermissions
} from "@/lib/meta-graph";

/**
 * Diagnóstico TEMPORÁRIO da conexão Meta + permissões por conta de anúncio.
 * Não expõe tokens. Remover após diagnosticar.
 */
export async function GET() {
  const { tenant, user, metaAccessToken } = await getAppContext();

  const connection = await getMetaConnectionInfo(tenant.id, user.id, metaAccessToken);
  const workspaceToken = await resolveWorkspaceMetaAccessToken(tenant.id, user.id, metaAccessToken);
  const tenantToken = await getTenantMetaAccessToken(tenant.id, user.id);

  const safe = async <T>(fn: () => Promise<T>) => {
    try {
      return { ok: true as const, data: await fn() };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
    }
  };

  // Probe de acesso a UMA conta com um token (tenta listar campanhas).
  const probe = async (token: string | undefined, metaAdAccountId: string) => {
    if (!token) return { ok: false, error: "sem token" };
    try {
      const camps = await fetchCampaigns(token, metaAdAccountId);
      return { ok: true, campaigns: camps.length };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  };

  const effective = workspaceToken;
  const ownDiffers = !!metaAccessToken && metaAccessToken !== effective;

  const noToken = { ok: false as const, error: "sem token efetivo" };
  const [permissions, meAccounts, businesses] = await Promise.all([
    effective ? safe(() => fetchMyPermissions(effective)) : Promise.resolve(noToken),
    effective ? safe(() => fetchMyAdAccounts(effective)) : Promise.resolve(noToken),
    effective ? safe(() => fetchMyBusinesses(effective)) : Promise.resolve(noToken)
  ]);

  // Clientes + contas vinculadas (DB) e teste de acesso por conta.
  const { client: clientRepo, adAccount: adAccountRepo } = await repositories();
  const clients = await clientRepo.find({ where: { tenantId: tenant.id } });
  const clientReports = [];
  for (const c of clients) {
    const linked = await adAccountRepo.find({ where: { clientId: c.id } });
    const accounts = [];
    for (const a of linked) {
      const withEffective = await probe(effective, a.metaAdAccountId);
      const withOwn = ownDiffers ? await probe(metaAccessToken, a.metaAdAccountId) : undefined;
      accounts.push({
        metaAdAccountId: a.metaAdAccountId,
        label: a.label ?? null,
        metaBusinessId: a.metaBusinessId ?? null,
        accessWithWorkspaceToken: withEffective,
        accessWithOwnToken: withOwn
      });
    }
    clientReports.push({
      client: c.name,
      slug: slugify(c.name),
      metaBusinessId: c.metaBusinessId ?? null,
      linkedAccounts: accounts.length,
      accounts
    });
  }

  const permList =
    permissions.ok && Array.isArray(permissions.data) ? (permissions.data as Array<{ permission: string; status: string }>) : [];
  const permStatus = (name: string) => permList.find((p) => p.permission === name)?.status ?? "missing";

  return NextResponse.json({
    ok: true,
    tenantId: tenant.id,
    connection,
    tokens: {
      hasWorkspaceToken: !!tenantToken,
      hasOwnSessionToken: !!metaAccessToken,
      usingForData: effective ? (effective === tenantToken ? "workspace" : "own") : "none",
      ownDiffersFromEffective: ownDiffers
    },
    permissionsCheck: {
      business_management: permStatus("business_management"),
      ads_read: permStatus("ads_read"),
      ads_management: permStatus("ads_management")
    },
    meAdAccounts:
      meAccounts.ok && Array.isArray(meAccounts.data)
        ? (meAccounts.data as Array<{ id: string; name?: string; account_status?: number; business?: { id: string; name?: string } | null }>).map((a) => ({
            id: a.id,
            name: a.name ?? null,
            account_status: a.account_status ?? null,
            business: a.business ?? null
          }))
        : meAccounts,
    businessesCount: businesses.ok && Array.isArray(businesses.data) ? businesses.data.length : null,
    clients: clientReports
  });
}
