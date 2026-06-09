import { NextResponse } from "next/server";
import { In } from "typeorm";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { enrichCampaignRowsFromMeta } from "@/lib/campaign-metrics-enrich";
import { matchesClientBusinessScope } from "@/lib/client-meta-business";
import { listClientIdsForUser } from "@/lib/client-meta-settings";
import {
  queryCampaignComparison,
  queryCommandCenterCampaigns,
  type CampaignCompareRow
} from "@/lib/command-center-query";
import { getTenantMetaAccessToken } from "@/lib/meta-auth-store";
import { parsePeriodFromSearchParams, todayIso, yesterdayIso } from "@/lib/report-period";

function isTodayRange(since: string, until: string) {
  const t = todayIso();
  return since.slice(0, 10) === t && until.slice(0, 10) === t;
}

export async function GET(req: Request) {
  try {
    const { tenant, user, metaAccessToken } = await getAppContext();
    const url = new URL(req.url);
    const tenantToken = await getTenantMetaAccessToken(tenant.id, user.id);
    const tokenForMeta = metaAccessToken ?? tenantToken;

    const userClientIds = await listClientIdsForUser(tenant.id, user.id);
    let clientIds = userClientIds;
    let metaBusinessId: string | null = null;

    const clientParam = url.searchParams.get("clientId")?.trim();
    if (clientParam) {
      const client = await getClientBySlugOrId(tenant.id, clientParam);
      if (!client) {
        return NextResponse.json({ ok: true, rows: [], periodA: null, periodB: null });
      }
      if (userClientIds?.length && !userClientIds.includes(client.id)) {
        return NextResponse.json({ ok: false, error: "Sem acesso a este cliente" }, { status: 403 });
      }
      clientIds = [client.id];
      metaBusinessId = client.metaBusinessId?.trim() || null;
    }

    const preset = url.searchParams.get("compare")?.trim() ?? "today_yesterday";
    let sinceA = url.searchParams.get("sinceA")?.slice(0, 10);
    let untilA = url.searchParams.get("untilA")?.slice(0, 10);
    let sinceB = url.searchParams.get("sinceB")?.slice(0, 10);
    let untilB = url.searchParams.get("untilB")?.slice(0, 10);

    if (preset === "today_yesterday" || (!sinceA && !sinceB)) {
      const today = todayIso();
      const yesterday = yesterdayIso();
      sinceA = today;
      untilA = today;
      sinceB = yesterday;
      untilB = yesterday;
    } else if (preset === "custom") {
      if (!sinceA || !untilA || !sinceB || !untilB) {
        return NextResponse.json({ ok: false, error: "Datas de comparação incompletas" }, { status: 400 });
      }
    } else {
      const periodA = parsePeriodFromSearchParams(new URL(`http://x?period=${preset}`));
      if (periodA.since && periodA.until) {
        sinceA = periodA.since;
        untilA = periodA.until;
      }
    }

    if (!sinceA || !untilA || !sinceB || !untilB) {
      return NextResponse.json({ ok: false, error: "Período inválido" }, { status: 400 });
    }

    const result = await queryCampaignComparison({
      tenantId: tenant.id,
      clientIds,
      metaBusinessId,
      sinceA,
      untilA,
      sinceB,
      untilB,
      q: url.searchParams.get("q")?.trim() || undefined
    });

    let rows: CampaignCompareRow[] = result.rows;
    let enrichError: string | null = null;
    let periodASource: "db" | "live" | "live-cached" = "db";

    const liveA =
      url.searchParams.get("liveA") === "1" ||
      (url.searchParams.get("liveA") !== "0" && isTodayRange(sinceA, untilA));
    const refresh = url.searchParams.get("refresh") === "1";

    if (liveA && tokenForMeta) {
      const periodA = await queryCommandCenterCampaigns({
        tenantId: tenant.id,
        clientIds,
        metaBusinessId,
        since: sinceA,
        until: untilA,
        q: url.searchParams.get("q")?.trim() || undefined,
        limit: 500,
        offset: 0,
        includeTotals: false,
        skipAggregates: true
      });

      if (periodA.rows.length) {
        const { adAccount: adRepo } = await repositories();
        let accounts = await adRepo.find({
          where: { id: In([...new Set(periodA.rows.map((r) => r.adAccountId))]) }
        });
        if (metaBusinessId) {
          accounts = accounts.filter((a) => matchesClientBusinessScope(a.metaBusinessId, metaBusinessId));
        }

        const enriched = await enrichCampaignRowsFromMeta({
          rows: periodA.rows,
          metaAccessToken: tokenForMeta,
          accounts: accounts.map((a) => ({ id: a.id, metaAdAccountId: a.metaAdAccountId })),
          since: sinceA,
          until: untilA,
          skipIfHasSpend: false,
          tenantId: tenant.id,
          refresh
        });

        const liveById = new Map(enriched.rows.map((r) => [r.metaCampaignId, r]));
        const compareById = new Map(rows.map((r) => [r.metaCampaignId, { ...r }]));

        for (const [id, live] of liveById) {
          const cur = compareById.get(id);
          if (cur) {
            cur.spendA = live.spend;
            cur.conversionsA = live.conversions;
            cur.leadsA = live.leads;
            cur.cpaA = live.cpa;
            cur.roasA = live.roas;
            cur.impressionsA = live.impressions ?? 0;
          } else {
            compareById.set(id, {
              metaCampaignId: id,
              campaignName: live.campaignName,
              clientName: live.clientName,
              clientSlug: live.clientSlug,
              spendA: live.spend,
              spendB: 0,
              conversionsA: live.conversions,
              conversionsB: 0,
              leadsA: live.leads,
              leadsB: 0,
              cpaA: live.cpa,
              cpaB: null,
              roasA: live.roas,
              roasB: 0,
              impressionsA: live.impressions ?? 0,
              impressionsB: 0
            });
          }
        }

        rows = [...compareById.values()].sort((a, b) => b.spendA - a.spendA);
        enrichError = enriched.enrichError ?? null;
        periodASource = enriched.fromCache ? "live-cached" : "live";
      }
    } else if (liveA && !tokenForMeta) {
      enrichError = "Conecte a Meta para métricas de hoje no comparativo.";
    }

    return NextResponse.json({
      ok: true,
      rows,
      periodA: { since: sinceA, until: untilA, source: periodASource },
      periodB: { since: sinceB, until: untilB, source: "db" as const },
      enrichError
    });
  } catch (err) {
    console.error("[command-center/compare]", err);
    const message = err instanceof Error ? err.message : "Erro na comparação";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
