import { NextResponse } from "next/server";
import { In } from "typeorm";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId, slugify } from "@/lib/app-context";
import {
  filterCampaignListRows,
  hydrateCampaignAlerts
} from "@/lib/campaign-list-filters";
import { enrichCampaignRowsFromMeta } from "@/lib/campaign-metrics-enrich";
import { matchesClientBusinessScope } from "@/lib/client-meta-business";
import { listClientIdsForUser } from "@/lib/client-meta-settings";
import { queryCommandCenterCampaigns } from "@/lib/command-center-query";
import {
  getTenantMetaAccessToken,
  isMetaPermissionError
} from "@/lib/meta-auth-store";
import { fetchCampaigns } from "@/lib/meta-graph";
import { parsePeriodFromSearchParams, rollingDaysEndingYesterday } from "@/lib/report-period";

export async function GET(req: Request) {
  const { tenant, user, metaAccessToken } = await getAppContext();
  const url = new URL(req.url);
  const period = parsePeriodFromSearchParams(url);
  const tenantToken = await getTenantMetaAccessToken(tenant.id, user.id);
  let tokenForMeta = metaAccessToken ?? tenantToken;

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

  const searchQ = url.searchParams.get("q")?.trim() ?? "";
  const onlyAlerts = url.searchParams.get("onlyAlerts") === "1";
  const live = url.searchParams.get("live") === "1";

  const cc = await queryCommandCenterCampaigns({
    tenantId: tenant.id,
    clientIds,
    metaBusinessId: scopeClient?.metaBusinessId ?? null,
    statusFilter,
    q: undefined,
    onlyAlerts: false,
    days: period.days ?? undefined,
    since: period.since,
    until: period.until,
    allTime: period.allTime,
    limit: 5000,
    offset: 0
  });

  type ListRow = (typeof cc.rows)[number] & {
    objective?: string | null;
    dailyBudget?: number | null;
  };
  const byId = new Map<string, ListRow>(
    cc.rows.map((r) => [
      r.metaCampaignId,
      { ...r, status: r.status ?? "ACTIVE", objective: null }
    ])
  );

  const accountsForEnrich: Array<{ id: string; metaAdAccountId: string; clientId: string }> = [];

  if (tokenForMeta && live) {
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

    async function loadCampaignsFromMeta(accessToken: string, retried = false) {
      for (const acc of accounts) {
        try {
          const camps = await fetchCampaigns(accessToken, acc.metaAdAccountId);
          const client = clientById.get(acc.clientId);
          for (const c of camps) {
            const budgetFromMeta = c.daily_budget ? Number(c.daily_budget) / 100 : null;
            if (!c.id || byId.has(c.id)) {
              if (c.id && byId.has(c.id)) {
                const row = byId.get(c.id)!;
                row.status = c.status ?? row.status;
                row.objective = c.objective ?? row.objective;
                if (budgetFromMeta != null) row.dailyBudget = budgetFromMeta;
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
              dailyBudget: budgetFromMeta,
              status: c.status ?? "UNKNOWN",
              objective: c.objective ?? null
            });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (!retried && isMetaPermissionError(msg) && tenantToken && tenantToken !== accessToken) {
            tokenForMeta = tenantToken;
            await loadCampaignsFromMeta(tenantToken, true);
            return;
          }
        }
      }
    }

    await loadCampaignsFromMeta(tokenForMeta);
  }

  let rows = [...byId.values()].sort((a, b) =>
    (a.campaignName ?? "").localeCompare(b.campaignName ?? "")
  );

  const since =
    period.since ??
    (period.allTime
      ? new Date(new Date().setFullYear(new Date().getFullYear() - 2)).toISOString().slice(0, 10)
      : rollingDaysEndingYesterday(7).since);
  const until = period.until ?? rollingDaysEndingYesterday(7).until;

  let enrichError: string | undefined;
  let metricsSource: "db" | "live" = "db";
  if (tokenForMeta && accountsForEnrich.length && live) {
    metricsSource = "live";
    let enriched = await enrichCampaignRowsFromMeta({
      rows: rows as Parameters<typeof enrichCampaignRowsFromMeta>[0]["rows"],
      metaAccessToken: tokenForMeta,
      accounts: accountsForEnrich.map((a) => ({ id: a.id, metaAdAccountId: a.metaAdAccountId })),
      since,
      until,
      skipIfHasSpend: true
    });
    if (
      enriched.enrichError &&
      isMetaPermissionError(enriched.enrichError) &&
      tenantToken &&
      tenantToken !== tokenForMeta
    ) {
      tokenForMeta = tenantToken;
      enriched = await enrichCampaignRowsFromMeta({
        rows: rows as Parameters<typeof enrichCampaignRowsFromMeta>[0]["rows"],
        metaAccessToken: tenantToken,
        accounts: accountsForEnrich.map((a) => ({ id: a.id, metaAdAccountId: a.metaAdAccountId })),
        since,
        until,
        skipIfHasSpend: true
      });
    }
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

  const { alert: alertRepo } = await repositories();
  const openAlerts = await alertRepo.find({
    where: { tenantId: tenant.id, dismissed: false }
  });
  const alertsByCampaign = new Map<string, number>();
  for (const a of openAlerts) {
    if (!a.metaCampaignId) continue;
    alertsByCampaign.set(a.metaCampaignId, (alertsByCampaign.get(a.metaCampaignId) ?? 0) + 1);
  }
  rows = hydrateCampaignAlerts(rows, alertsByCampaign);
  rows = filterCampaignListRows(rows, { q: searchQ, onlyAlerts });

  const total = rows.length;
  const totals = {
    spend: rows.reduce((s, r) => s + (r.spend ?? 0), 0),
    conversions: rows.reduce((s, r) => s + (r.conversions ?? 0), 0),
    leads: rows.reduce((s, r) => s + (r.leads ?? 0), 0),
    impressions: rows.reduce((s, r) => s + (r.impressions ?? 0), 0),
    clicks: rows.reduce((s, r) => s + (r.clicks ?? 0), 0)
  };
  rows = rows.slice(offset, offset + limit);

  return NextResponse.json({
    ok: true,
    rows,
    total,
    totals,
    enrichError: enrichError ?? null,
    metricsSource,
    period: { preset: period.preset, since: period.since, until: period.until }
  });
}
