import { NextResponse } from "next/server";
import { In } from "typeorm";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId, slugify } from "@/lib/app-context";
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

function filterByObjective<T extends { objective?: string | null }>(
  rows: T[],
  objectiveRaw: string
): T[] {
  return rows.filter((r) => {
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

export async function GET(req: Request) {
  try {
    const { tenant, user, metaAccessToken } = await getAppContext();
    const url = new URL(req.url);
    const period = parsePeriodFromSearchParams(url);
    const tenantToken = await getTenantMetaAccessToken(tenant.id, user.id);
    let tokenForMeta = metaAccessToken ?? tenantToken;

    const allowedClientIds = await listClientIdsForUser(tenant.id, user.id);
    let clientIds = allowedClientIds;
    const clientSlug = url.searchParams.get("clientId")?.trim();
    let scopeClient: Awaited<ReturnType<typeof getClientBySlugOrId>> = null;

    if (clientSlug) {
      scopeClient = await getClientBySlugOrId(tenant.id, clientSlug);
      if (!scopeClient) {
        return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
      }
      if (allowedClientIds?.length && !allowedClientIds.includes(scopeClient.id)) {
        return NextResponse.json({ ok: false, error: "Sem acesso a este cliente" }, { status: 403 });
      }
      clientIds = [scopeClient.id];
    }

    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? "50")));
    const offset = Math.max(0, Number(url.searchParams.get("offset") ?? "0"));

    const statusRaw = url.searchParams.get("status");
    const statusFilter =
      statusRaw === "ACTIVE" || statusRaw === "PAUSED" || statusRaw === "INACTIVE"
        ? statusRaw
        : "ALL";

    const searchQ = url.searchParams.get("q")?.trim() ?? "";
    const onlyAlerts = url.searchParams.get("onlyAlerts") === "1";
    const showZero = url.searchParams.get("showZero") !== "0";
    const live = url.searchParams.get("live") === "1";
    const refresh = url.searchParams.get("refresh") === "1";
    const sortKey = url.searchParams.get("sort");
    const sortDir = url.searchParams.get("dir") === "asc" ? "asc" : "desc";
    const objectiveRaw = url.searchParams.get("objective");

    const since =
      period.since ??
      (period.allTime
        ? new Date(new Date().setFullYear(new Date().getFullYear() - 2)).toISOString().slice(0, 10)
        : rollingDaysEndingYesterday(7).since);
    const until = period.until ?? rollingDaysEndingYesterday(7).until;

    if (!live) {
      const cc = await queryCommandCenterCampaigns({
        tenantId: tenant.id,
        clientIds,
        metaBusinessId: scopeClient?.metaBusinessId ?? null,
        statusFilter,
        q: searchQ,
        onlyAlerts,
        hideZeroActivity: !showZero,
        days: period.days ?? undefined,
        since: period.since,
        until: period.until,
        allTime: period.allTime,
        limit,
        offset,
        sort: sortKey,
        sortDir,
        includeTotals: true
      });

      type ListRow = (typeof cc.rows)[number] & { objective?: string | null };
      let rows = cc.rows as ListRow[];
      let total = cc.total;

      if (objectiveRaw === "leads" || objectiveRaw === "sales" || objectiveRaw === "traffic") {
        rows = filterByObjective(rows, objectiveRaw);
        total = rows.length;
      }

      return NextResponse.json({
        ok: true,
        rows,
        total,
        totals: cc.totals ?? {
          spend: 0,
          conversions: 0,
          leads: 0,
          impressions: 0,
          clicks: 0
        },
        enrichError: null,
        metricsSource: "db" as const,
        period: { preset: period.preset, since: period.since, until: period.until }
      });
    }

    // Modo ao vivo (Atualizar): busca mais linhas, enriquece na Meta, pagina depois.
    const cc = await queryCommandCenterCampaigns({
    tenantId: tenant.id,
    clientIds,
    metaBusinessId: scopeClient?.metaBusinessId ?? null,
    statusFilter,
    q: searchQ,
    onlyAlerts,
    hideZeroActivity: !showZero,
    days: period.days ?? undefined,
    since: period.since,
    until: period.until,
    allTime: period.allTime,
    limit: 5000,
    offset: 0,
    sort: sortKey,
    sortDir,
    includeTotals: true
  });

  type ListRow = (typeof cc.rows)[number] & {
    objective?: string | null;
    dailyBudget?: number | null;
  };
  const byId = new Map<string, ListRow>(
    cc.rows.map((r) => [r.metaCampaignId, { ...r, objective: null }])
  );

  const accountsForEnrich: Array<{ id: string; metaAdAccountId: string; clientId: string }> = [];

  if (tokenForMeta) {
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

  let rows = [...byId.values()];
  let enrichError: string | undefined;
  let metricsSource: "live" | "live-cached" = "live";
  let cachedAt: string | null = null;

  if (!tokenForMeta) {
    enrichError = "Conecte a Meta em Configurações para ver métricas de hoje ao vivo.";
    metricsSource = "live";
  } else if (accountsForEnrich.length) {
    let enriched = await enrichCampaignRowsFromMeta({
      rows: rows as Parameters<typeof enrichCampaignRowsFromMeta>[0]["rows"],
      metaAccessToken: tokenForMeta,
      accounts: accountsForEnrich.map((a) => ({ id: a.id, metaAdAccountId: a.metaAdAccountId })),
      since,
      until,
      skipIfHasSpend: period.preset !== "today",
      tenantId: tenant.id,
      refresh
    });
    if (
      enriched.permissionDenied &&
      tenantToken &&
      tenantToken !== tokenForMeta
    ) {
      enriched = await enrichCampaignRowsFromMeta({
        rows: rows as Parameters<typeof enrichCampaignRowsFromMeta>[0]["rows"],
        metaAccessToken: tenantToken,
        accounts: accountsForEnrich.map((a) => ({ id: a.id, metaAdAccountId: a.metaAdAccountId })),
        since,
        until,
        skipIfHasSpend: period.preset !== "today",
        tenantId: tenant.id,
        refresh
      });
    }
    rows = enriched.rows as ListRow[];
    enrichError = enriched.enrichError;
    metricsSource = enriched.fromCache ? "live-cached" : "live";
    cachedAt = enriched.cachedAt ?? null;
  }

  if (objectiveRaw === "leads" || objectiveRaw === "sales" || objectiveRaw === "traffic") {
    rows = filterByObjective(rows, objectiveRaw);
  }

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
    cachedAt,
    period: { preset: period.preset, since: period.since, until: period.until }
  });
  } catch (err) {
    console.error("[campaigns/list]", err);
    const message = err instanceof Error ? err.message : "Erro ao listar campanhas";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
