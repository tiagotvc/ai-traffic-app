import "server-only";

import { Between, In } from "typeorm";

import { repositories } from "@/db/repositories";
import { getClientBySlugOrId, listClientsForTenant } from "@/lib/app-context";
export async function resolveDashboardScope(
  tenantId: string,
  clientIdParam?: string | null,
  adAccountIdParam?: string | null
) {
  const { adAccount: adAccountRepo } = await repositories();

  let clientIds: string[] | null = null;
  if (clientIdParam) {
    const client = await getClientBySlugOrId(tenantId, clientIdParam);
    if (client) clientIds = [client.id];
  } else {
    const clients = await listClientsForTenant(tenantId);
    clientIds = clients.map((c) => c.id);
  }

  if (!clientIds?.length) {
    return { accountIds: [] as string[], adAccounts: [] };
  }

  let accounts = await adAccountRepo.find({ where: { clientId: In(clientIds) } });

  if (adAccountIdParam) {
    accounts = accounts.filter(
      (a) => a.id === adAccountIdParam || a.metaAdAccountId === adAccountIdParam
    );
  }

  return {
    accountIds: accounts.map((a) => a.id),
    adAccounts: accounts
  };
}

export function parseDashboardSearchParams(url: URL) {
  const clientId = url.searchParams.get("clientId");
  const adAccountId = url.searchParams.get("adAccountId");
  const daysRaw = Number(url.searchParams.get("days") ?? "7");
  const days = Number.isFinite(daysRaw) ? Math.min(90, Math.max(1, daysRaw)) : 7;
  return {
    clientId: clientId || null,
    adAccountId: adAccountId || null,
    days
  };
}

export function dateNDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function loadMetricRows(accountIds: string[], days = 30) {
  const { metricSnapshot: metricsRepo } = await repositories();
  if (!accountIds.length) return [];

  const start = dateNDaysAgo(days);
  const end = new Date().toISOString().slice(0, 10);
  return metricsRepo.find({
    where: { adAccountId: In(accountIds), day: Between(start, end) },
    order: { day: "ASC" }
  });
}
