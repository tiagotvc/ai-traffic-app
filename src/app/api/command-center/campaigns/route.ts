import { NextResponse } from "next/server";
import { In } from "typeorm";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId, slugify } from "@/lib/app-context";
import { getCampaignPresetsMap, withCampaignPresets } from "@/lib/campaign-preset-store";
import { filterCampaignRowsByStatus } from "@/lib/campaign-status-filter";
import { enrichCampaignRowsFromMeta } from "@/lib/campaign-metrics-enrich";
import { matchesClientBusinessScope } from "@/lib/client-meta-business";
import { listClientIdsForUser } from "@/lib/client-meta-settings";
import {
  queryCommandCenterCampaigns,
  type CommandCenterCampaignRow
} from "@/lib/command-center-query";
import {
  getTenantMetaAccessToken,
  isMetaPermissionError
} from "@/lib/meta-auth-store";
import { fetchCampaigns } from "@/lib/meta-graph";
import { parsePeriodFromSearchParams } from "@/lib/report-period";

export async function GET(req: Request) {
  try {
    const { tenant, user, metaAccessToken } = await getAppContext();
    const presetMap = await getCampaignPresetsMap(tenant.id);
    const url = new URL(req.url);
    const period = parsePeriodFromSearchParams(url);
    const tenantToken = await getTenantMetaAccessToken(tenant.id, user.id);
    let tokenForMeta = metaAccessToken ?? tenantToken;

    const userClientIds = await listClientIdsForUser(tenant.id, user.id);
    const clientParam = url.searchParams.get("clientId");
    let clientIds = userClientIds;
    let metaBusinessId: string | null = null;

    if (clientParam) {
      const client = await getClientBySlugOrId(tenant.id, clientParam);
      if (!client) {
        return NextResponse.json({ ok: true, rows: [], total: 0, metricsSource: "db", presets: presetMap });
      }
      if (userClientIds?.length && !userClientIds.includes(client.id)) {
        return NextResponse.json({ ok: true, rows: [], total: 0, metricsSource: "db", presets: presetMap });
      }
      clientIds = [client.id];
      metaBusinessId = client.metaBusinessId?.trim() || null;
    }

    const statusRaw = url.searchParams.get("status");
    const statusFilter =
      statusRaw === "ACTIVE" || statusRaw === "PAUSED" || statusRaw === "INACTIVE"
        ? statusRaw
        : "ALL";

    const live = url.searchParams.get("live") === "1";
    const refresh = url.searchParams.get("refresh") === "1";

    const result = await queryCommandCenterCampaigns({
      tenantId: tenant.id,
      clientIds,
      metaBusinessId,
      statusFilter: live ? "ALL" : statusFilter,
      q: url.searchParams.get("q") ?? undefined,
      onlyAlerts: url.searchParams.get("onlyAlerts") === "1",
      tag: url.searchParams.get("tag") ?? undefined,
      days: period.days ?? undefined,
      since: period.since,
      until: period.until,
      allTime: period.allTime,
      limit: Number(url.searchParams.get("limit") ?? "500"),
      offset: Number(url.searchParams.get("offset") ?? "0"),
      includeTotals: false,
      skipAggregates: true
    });

    const byId = new Map<string, CommandCenterCampaignRow>(
      result.rows.map((r) => [r.metaCampaignId, { ...r }])
    );

    let enrichError: string | undefined;
    let metricsSource: "db" | "live" | "live-cached" = "db";
    let cachedAt: string | null = null;

    if (live && !tokenForMeta) {
      enrichError = "Conecte a Meta em Configurações para ver métricas de hoje ao vivo.";
    } else if (live && tokenForMeta && period.since && period.until && !period.allTime) {
      const { adAccount: adRepo, client: clientRepo } = await repositories();
      const clients = await clientRepo.find({ where: { tenantId: tenant.id } });
      const allowed = new Set(clientIds?.length ? clientIds : clients.map((c) => c.id));
      let accounts = await adRepo.find({ where: { clientId: In([...allowed]) } });

      if (metaBusinessId) {
        accounts = accounts.filter((a) => matchesClientBusinessScope(a.metaBusinessId, metaBusinessId));
      }

      const clientById = new Map(clients.map((c) => [c.id, c]));

      async function loadCampaignsFromMeta(accessToken: string, retried = false) {
        for (const acc of accounts) {
          try {
            const camps = await fetchCampaigns(accessToken, acc.metaAdAccountId);
            const client = clientById.get(acc.clientId);
            for (const c of camps) {
              const budgetFromMeta = c.daily_budget ? Number(c.daily_budget) / 100 : null;
              if (c.id && byId.has(c.id)) {
                const row = byId.get(c.id)!;
                row.status = c.status ?? row.status;
                if (budgetFromMeta != null) row.dailyBudget = budgetFromMeta;
                continue;
              }
              if (!c.id) continue;
              byId.set(c.id, {
                metaCampaignId: c.id,
                campaignName: c.name ?? c.id,
                clientId: acc.clientId,
                clientName: client?.name ?? "—",
                clientSlug: client ? slugify(client.name) : "",
                clientTag: null,
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
                reach: 0,
                messages: 0,
                frequency: 0,
                alertCount: 0,
                hasAlert: false,
                dailyBudget: budgetFromMeta,
                status: c.status ?? "UNKNOWN"
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

      const rowsForEnrich = [...byId.values()];
      if (rowsForEnrich.length && accounts.length) {
        let enriched = await enrichCampaignRowsFromMeta({
          rows: rowsForEnrich as Parameters<typeof enrichCampaignRowsFromMeta>[0]["rows"],
          metaAccessToken: tokenForMeta,
          accounts: accounts.map((a) => ({ id: a.id, metaAdAccountId: a.metaAdAccountId })),
          since: period.since,
          until: period.until,
          skipIfHasSpend: period.preset !== "today",
          tenantId: tenant.id,
          refresh
        });
        if (enriched.permissionDenied && tenantToken && tenantToken !== tokenForMeta) {
          enriched = await enrichCampaignRowsFromMeta({
            rows: rowsForEnrich as Parameters<typeof enrichCampaignRowsFromMeta>[0]["rows"],
            metaAccessToken: tenantToken,
            accounts: accounts.map((a) => ({ id: a.id, metaAdAccountId: a.metaAdAccountId })),
            since: period.since,
            until: period.until,
            skipIfHasSpend: period.preset !== "today",
            tenantId: tenant.id,
            refresh
          });
        }
        for (const r of enriched.rows) {
          byId.set(r.metaCampaignId, r as CommandCenterCampaignRow);
        }
        enrichError = enriched.enrichError;
        metricsSource = enriched.fromCache ? "live-cached" : "live";
        cachedAt = enriched.cachedAt ?? null;
      }
    }

    const rows = withCampaignPresets(
      filterCampaignRowsByStatus([...byId.values()], statusFilter),
      presetMap
    );

    return NextResponse.json({
      ok: true,
      rows,
      total: live ? rows.length : result.total,
      presets: presetMap,
      metricsSource,
      cachedAt,
      enrichError: enrichError ?? null,
      period: { preset: period.preset, since: period.since, until: period.until }
    });
  } catch (err) {
    console.error("[command-center/campaigns]", err);
    const message = err instanceof Error ? err.message : "Erro ao carregar campanhas";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
