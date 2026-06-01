import { NextResponse } from "next/server";
import { In } from "typeorm";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { enrichCampaignRowsFromMeta } from "@/lib/campaign-metrics-enrich";
import { listClientIdsForUser } from "@/lib/client-meta-settings";
import { queryCommandCenterCampaigns } from "@/lib/command-center-query";
import { parsePeriodFromSearchParams } from "@/lib/report-period";

export async function GET(req: Request) {
  const { tenant, user, metaAccessToken } = await getAppContext();
  const url = new URL(req.url);
  const period = parsePeriodFromSearchParams(url);

  const userClientIds = await listClientIdsForUser(tenant.id, user.id);
  const clientParam = url.searchParams.get("clientId");
  let clientIds = userClientIds;
  let metaBusinessId: string | null = null;

  if (clientParam) {
    const client = await getClientBySlugOrId(tenant.id, clientParam);
    if (!client) {
      return NextResponse.json({ ok: true, rows: [], total: 0 });
    }
    if (userClientIds?.length && !userClientIds.includes(client.id)) {
      return NextResponse.json({ ok: true, rows: [], total: 0 });
    }
    clientIds = [client.id];
    metaBusinessId = client.metaBusinessId?.trim() || null;
  }

  const statusRaw = url.searchParams.get("status");
  const statusFilter =
    statusRaw === "ACTIVE" || statusRaw === "PAUSED" || statusRaw === "INACTIVE"
      ? statusRaw
      : "ALL";

  const result = await queryCommandCenterCampaigns({
    tenantId: tenant.id,
    clientIds,
    metaBusinessId,
    statusFilter,
    q: url.searchParams.get("q") ?? undefined,
    onlyAlerts: url.searchParams.get("onlyAlerts") === "1",
    tag: url.searchParams.get("tag") ?? undefined,
    days: period.days ?? undefined,
    since: period.since,
    until: period.until,
    allTime: period.allTime,
    limit: Number(url.searchParams.get("limit") ?? "500"),
    offset: Number(url.searchParams.get("offset") ?? "0")
  });

  let rows = result.rows;
  let enrichError: string | undefined;

  if (metaAccessToken && period.since && period.until && !period.allTime) {
    const { adAccount: adRepo } = await repositories();
    const accountIds = [...new Set(rows.map((r) => r.adAccountId))];
    const accounts =
      accountIds.length > 0
        ? await adRepo.find({ where: { id: In(accountIds) } })
        : [];

    const enriched = await enrichCampaignRowsFromMeta({
      rows: rows as Parameters<typeof enrichCampaignRowsFromMeta>[0]["rows"],
      metaAccessToken,
      accounts: accounts.map((a) => ({ id: a.id, metaAdAccountId: a.metaAdAccountId })),
      since: period.since,
      until: period.until,
      skipIfHasSpend: false
    });
    rows = enriched.rows as typeof rows;
    enrichError = enriched.enrichError;
  } else if (metaAccessToken && period.allTime) {
    const until = new Date().toISOString().slice(0, 10);
    const since = new Date();
    since.setFullYear(since.getFullYear() - 2);
    const { adAccount: adRepo } = await repositories();
    const accountIds = [...new Set(rows.map((r) => r.adAccountId))];
    const accounts =
      accountIds.length > 0
        ? await adRepo.find({ where: { id: In(accountIds) } })
        : [];
    const enriched = await enrichCampaignRowsFromMeta({
      rows: rows as Parameters<typeof enrichCampaignRowsFromMeta>[0]["rows"],
      metaAccessToken,
      accounts: accounts.map((a) => ({ id: a.id, metaAdAccountId: a.metaAdAccountId })),
      since: since.toISOString().slice(0, 10),
      until,
      skipIfHasSpend: false
    });
    rows = enriched.rows as typeof rows;
    enrichError = enriched.enrichError;
  }

  return NextResponse.json({
    ok: true,
    rows,
    total: result.total,
    enrichError: enrichError ?? null,
    period: { preset: period.preset, since: period.since, until: period.until }
  });
}
