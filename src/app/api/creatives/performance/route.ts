import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId, slugify } from "@/lib/app-context";
import { fetchAllAccountCreatives } from "@/lib/creatives-access";
import { getCreativesCacheTtlSec } from "@/lib/creatives-cache";
import { getAllTenantMetaTokens } from "@/lib/meta-auth-store";
import { repositories } from "@/db/repositories";
import { loadClientCreativesPerformance } from "@/lib/report-creatives-performance";
import { parsePeriodFromSearchParams } from "@/lib/report-period";
import { applyServerTiming } from "@/lib/server-timing";

export const maxDuration = 60;

export async function GET(req: Request) {
  const t0 = Date.now();
  const url = new URL(req.url);
  const clientIdParam = url.searchParams.get("clientId");
  const period = parsePeriodFromSearchParams(url);
  const { tenant, metaAccessToken: ctxToken } = await getAppContext();

  if (!clientIdParam) return NextResponse.json({ ok: true, groups: [] });
  const client = await getClientBySlugOrId(tenant.id, clientIdParam);
  if (!client) {
    return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
  }

  const tokens = await getAllTenantMetaTokens(tenant.id, ctxToken);
  if (!tokens.length) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const adAccountId = url.searchParams.get("adAccountId");
  const debug = url.searchParams.get("debug") === "1";
  const skipCache = url.searchParams.get("refresh") === "1";
  const cacheOnly = url.searchParams.get("cacheOnly") === "1";
  const { adAccount: adAccountRepo } = await repositories();
  let accounts = await adAccountRepo.find({ where: { clientId: client.id } });
  if (adAccountId) {
    accounts = accounts.filter((a) => a.metaAdAccountId === adAccountId || a.id === adAccountId);
  }

  const tFetch = Date.now();
  const { results: perAccount, warnings, partialData, dataSource, cacheHits, cacheMisses } =
    await fetchAllAccountCreatives(accounts, {
      tokens,
      since: period.since,
      until: period.until,
      tenantId: tenant.id,
      clientId: client.id,
      skipCache,
      cacheOnly,
      debug
    });
  const fetchMs = Date.now() - tFetch;

  const diag = debug
    ? {
        fetchMs,
        accountCount: accounts.length,
        period: { since: period.since, until: period.until },
        perAccount: perAccount.map((r) => r.diag).filter(Boolean) as Array<Record<string, unknown>>
      }
    : undefined;

  const { groups, creatives } =
    period.since && period.until
      ? await loadClientCreativesPerformance({
          tenantId: tenant.id,
          clientParam: clientIdParam,
          adAccountId,
          since: period.since,
          until: period.until,
          period,
          skipCache,
          perAccount
        })
      : { groups: [], creatives: [] };

  const cacheTtlSec = getCreativesCacheTtlSec();
  const dataProvenance = {
    source: dataSource,
    fetchedAt: new Date().toISOString(),
    cacheTtlSec,
    cacheHits: cacheHits ?? 0,
    partialData: partialData ?? false
  };

  const res = NextResponse.json({
    ok: true,
    groups,
    creatives,
    clientSlug: slugify(client.name),
    warnings,
    partialData,
    dataSource,
    cacheOnly,
    cacheMisses,
    dataProvenance,
    ...(debug && diag ? { diag } : {})
  });
  res.headers.set("X-Data-Source", dataSource);
  res.headers.set("X-Cache-TTL-Sec", String(cacheTtlSec));
  if (cacheOnly && cacheMisses > 0) {
    res.headers.set("X-Cache-Partial", "1");
  }
  return applyServerTiming(res, { total: Date.now() - t0, meta: fetchMs });
}
