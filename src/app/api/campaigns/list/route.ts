import { NextResponse } from "next/server";
import { In } from "typeorm";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId, slugify } from "@/lib/app-context";
import { enrichCampaignRowsFromMeta } from "@/lib/campaign-metrics-enrich";
import { matchesClientBusinessScope } from "@/lib/client-meta-business";
import { listClientIdsForUser } from "@/lib/client-meta-settings";
import { queryCommandCenterCampaigns } from "@/lib/command-center-query";
import { fetchCampaigns } from "@/lib/meta-graph";
import { parsePeriodFromSearchParams } from "@/lib/report-period";

export async function GET(req: Request) {
  const { tenant, user, metaAccessToken } = await getAppContext();
  const url = new URL(req.url);
  const period = parsePeriodFromSearchParams(url);

  let clientIds = await listClientIdsForUser(tenant.id, user.id);
  const clientSlug = url.searchParams.get("clientId")?.trim();
  let scopeClient: Awaited<ReturnType<typeof getClientBySlugOrId>> = null;
  if (clientSlug) {
    scopeClient = await getClientBySlugOrId(tenant.id, clientSlug);
    if (scopeClient) clientIds = [scopeClient.id];
  }

  const limit = Number(url.searchParams.get("limit") ?? "500");
  const offset = Number(url.searchParams.get("offset") ?? "0");

  const statusRaw = url.searchParams.get("status");
  const statusFilter =
    statusRaw === "ACTIVE" || statusRaw === "PAUSED" || statusRaw === "INACTIVE"
      ? statusRaw
      : "ALL";

  const cc = await queryCommandCenterCampaigns({
    tenantId: tenant.id,
    clientIds,
    metaBusinessId: scopeClient?.metaBusinessId ?? null,
    statusFilter,
    q: url.searchParams.get("q") ?? undefined,
    onlyAlerts: url.searchParams.get("onlyAlerts") === "1",
    days: period.days ?? undefined,
    since: period.since,
    until: period.until,
    allTime: period.allTime,
    limit: 5000,
    offset: 0
  });

  type ListRow = (typeof cc.rows)[number] & { objective?: string | null };
  const byId = new Map<string, ListRow>(
    cc.rows.map((r) => [
      r.metaCampaignId,
      { ...r, status: r.status ?? "ACTIVE", objective: null }
    ])
  );

  const accountsForEnrich: Array<{ id: string; metaAdAccountId: string; clientId: string }> = [];

  if (metaAccessToken) {
    const { adAccount: adRepo, client: clientRepo } = await repositories();
    const clients = await clientRepo.find({ where: { tenantId: tenant.id } });
    const allowed = new Set(clientIds?.length ? clientIds : clients.map((c) => c.id));
    let accounts = await adRepo.find({
      where: { clientId: In([...allowed]) }
    });

    const clientBm = scopeClient?.metaBusinessId?.trim() || null;
    if (clientBm) {
      accounts = accounts.filter((a) => matchesClientBusinessScope(a.metaBusinessId, clientBm));
    }

    for (const a of accounts) {
      accountsForEnrich.push({ id: a.id, metaAdAccountId: a.metaAdAccountId, clientId: a.clientId });
    }

    const clientById = new Map(clients.map((c) => [c.id, c]));

    for (const acc of accounts) {
      try {
        const camps = await fetchCampaigns(metaAccessToken, acc.metaAdAccountId);
        const client = clientById.get(acc.clientId);
        for (const c of camps) {
          if (!c.id || byId.has(c.id)) {
            if (c.id && byId.has(c.id)) {
              const row = byId.get(c.id)!;
              row.status = c.status ?? row.status;
              row.objective = c.objective ?? row.objective;
            }
            continue;
          }
          byId.set(c.id, {
            metaCampaignId: c.id,
            campaignName: c.name ?? c.id,
            clientId: acc.clientId,
            clientName: client?.name ?? "—",
            clientSlug: client ? slugify(client.name) : "",
            clientTag: "",
            adAccountId: acc.id,
            accountLabel: acc.label ?? acc.metaAdAccountId,
            metaAdAccountId: acc.metaAdAccountId,
            spend: 0,
            conversions: 0,
            leads: 0,
            cpl: null,
            cpa: null,
            roas: 0,
            impressions: 0,
            clicks: 0,
            ctr: 0,
            cpc: 0,
            cpm: 0,
            alertCount: 0,
            hasAlert: false,
            status: c.status ?? "UNKNOWN",
            objective: c.objective ?? null
          });
        }
      } catch {
        /* skip account */
      }
    }
  }

  let rows = [...byId.values()].sort((a, b) =>
    (a.campaignName ?? "").localeCompare(b.campaignName ?? "")
  );

  const since =
    period.since ??
    (period.allTime
      ? new Date(new Date().setFullYear(new Date().getFullYear() - 2)).toISOString().slice(0, 10)
      : new Date(new Date().setDate(new Date().getDate() - 6)).toISOString().slice(0, 10));
  const until = period.until ?? new Date().toISOString().slice(0, 10);

  let enrichError: string | undefined;
  if (metaAccessToken && accountsForEnrich.length) {
    const enriched = await enrichCampaignRowsFromMeta({
      rows: rows as Parameters<typeof enrichCampaignRowsFromMeta>[0]["rows"],
      metaAccessToken,
      accounts: accountsForEnrich.map((a) => ({ id: a.id, metaAdAccountId: a.metaAdAccountId })),
      since,
      until,
      skipIfHasSpend: true
    });
    rows = enriched.rows as ListRow[];
    enrichError = enriched.enrichError;
  }

  if (statusFilter === "ACTIVE") {
    rows = rows.filter((r) => r.status === "ACTIVE");
  } else if (statusFilter === "PAUSED") {
    rows = rows.filter((r) => r.status === "PAUSED");
  } else if (statusFilter === "INACTIVE") {
    rows = rows.filter((r) => r.status !== "ACTIVE");
  }

  const objectiveRaw = url.searchParams.get("objective");
  if (objectiveRaw === "leads" || objectiveRaw === "sales" || objectiveRaw === "traffic") {
    rows = rows.filter((r) => {
      const o = (r.objective ?? "").toUpperCase();
      if (objectiveRaw === "leads") {
        return o.includes("LEAD") || o.includes("OUTCOME_LEADS");
      }
      if (objectiveRaw === "sales") {
        return o.includes("SALES") || o.includes("CONVERSION") || o.includes("PURCHASE");
      }
      return o.includes("TRAFFIC") || o.includes("LINK_CLICK") || o.includes("REACH");
    });
  }

  const total = rows.length;
  rows = rows.slice(offset, offset + limit);

  return NextResponse.json({
    ok: true,
    rows,
    total,
    enrichError: enrichError ?? null,
    period: { preset: period.preset, since: period.since, until: period.until }
  });
}
