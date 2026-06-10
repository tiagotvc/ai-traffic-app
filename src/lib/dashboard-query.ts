import "server-only";

import { Between, In } from "typeorm";

import { repositories } from "@/db/repositories";
import { getClientBySlugOrId, listClientsForTenant } from "@/lib/app-context";
import { matchesClientBusinessScope } from "@/lib/client-meta-business";
import { addDaysIso, parsePeriodFromSearchParams, todayIso } from "@/lib/report-period";
export async function resolveDashboardScope(
  tenantId: string,
  clientIdParam?: string | null,
  adAccountIdParam?: string | null
) {
  const { adAccount: adAccountRepo } = await repositories();

  let clientIds: string[] | null = null;
  let clientBm: string | null = null;
  if (clientIdParam) {
    const client = await getClientBySlugOrId(tenantId, clientIdParam);
    if (client) {
      clientIds = [client.id];
      clientBm = client.metaBusinessId?.trim() || null;
    }
  } else {
    const clients = await listClientsForTenant(tenantId);
    clientIds = clients.map((c) => c.id);
  }

  if (!clientIds?.length) {
    return { accountIds: [] as string[], adAccounts: [] };
  }

  let accounts = await adAccountRepo.find({ where: { clientId: In(clientIds) } });

  if (clientBm) {
    accounts = accounts.filter((a) => matchesClientBusinessScope(a.metaBusinessId, clientBm));
  }

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

/** Mapa metaAdAccountId → IANA timezone, lido do inventário Meta (sincronizado). */
export async function inventoryTimezoneMap(tenantId: string) {
  const { metaAdAccountInventory } = await repositories();
  const rows = await metaAdAccountInventory.find({ where: { tenantId } });
  return new Map<string, string | null>(rows.map((r) => [r.metaAdAccountId, r.timezone ?? null]));
}

export function parseDashboardSearchParams(url: URL) {
  const clientId = url.searchParams.get("clientId");
  const adAccountId = url.searchParams.get("adAccountId");
  const period = parsePeriodFromSearchParams(url);
  return {
    clientId: clientId || null,
    adAccountId: adAccountId || null,
    days: period.days ?? 7,
    period
  };
}

export function dateNDaysAgo(n: number) {
  return addDaysIso(todayIso(), -n);
}

export async function loadMetricRows(
  accountIds: string[],
  days = 30,
  opts?: { since?: string | null; until?: string | null; allTime?: boolean }
) {
  const { metricSnapshot: metricsRepo, campaignMetricSnapshot: campRepo } = await repositories();
  if (!accountIds.length) return [];

  if (opts?.allTime) {
    return metricsRepo.find({
      where: { adAccountId: In(accountIds) },
      order: { day: "ASC" }
    });
  }

  const end = opts?.until?.slice(0, 10) ?? todayIso();
  const start = opts?.since?.slice(0, 10) ?? dateNDaysAgo(days);

  const accountRows = await metricsRepo.find({
    where: { adAccountId: In(accountIds), day: Between(start, end) },
    order: { day: "ASC" }
  });

  if (accountRows.length > 0) return accountRows;

  const campRows = await campRepo.find({
    where: { adAccountId: In(accountIds), day: Between(start, end) },
    order: { day: "ASC" }
  });

  return campRows.map((c) => ({
    adAccountId: c.adAccountId,
    day: c.day,
    spend: c.spend,
    impressions: c.impressions,
    clicks: c.clicks,
    ctr: c.ctr,
    cpc: c.cpc,
    conversions: c.conversions,
    reach: c.reach,
    messages: c.messages,
    roas: c.roas
  }));
}
