import { NextResponse } from "next/server";

import { getAppContext, getClientBySlugOrId, listClientsForTenant, slugify } from "@/lib/app-context";
import { fetchAllAccountCreatives } from "@/lib/creatives-access";
import { mergeCreativesIntoGroups } from "@/lib/creatives-ranking-merge";
import { getCreativesCacheTtlSec } from "@/lib/creatives-cache";
import { getAllTenantMetaTokens } from "@/lib/meta-auth-store";
import { loadRankConfig } from "@/lib/ranking-config";
import { repositories } from "@/db/repositories";
import { loadClientCreativesPerformance } from "@/lib/report-creatives-performance";
import { parsePeriodFromSearchParams, resolvedPeriodDays } from "@/lib/report-period";
import type { CreativeAccessWarning } from "@/lib/creatives-access-types";
import { applyServerTiming } from "@/lib/server-timing";

export const maxDuration = 60;

export async function GET(req: Request) {
  const t0 = Date.now();
  const url = new URL(req.url);
  const clientIdParam = url.searchParams.get("clientId");
  const period = parsePeriodFromSearchParams(url);
  const { tenant, metaAccessToken: ctxToken } = await getAppContext();

  const tokens = await getAllTenantMetaTokens(tenant.id, ctxToken);
  if (!tokens.length) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const adAccountId = url.searchParams.get("adAccountId");
  const debug = url.searchParams.get("debug") === "1";
  const skipCache = url.searchParams.get("refresh") === "1";
  const cacheOnly = url.searchParams.get("cacheOnly") === "1";

  if (!clientIdParam) {
    return handleAllClients({
      tenantId: tenant.id,
      period,
      adAccountId,
      skipCache,
      cacheOnly,
      debug,
      t0,
      ctxToken
    });
  }

  const client = await getClientBySlugOrId(tenant.id, clientIdParam);
  if (!client) {
    return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
  }

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

async function handleAllClients(input: {
  tenantId: string;
  period: ReturnType<typeof parsePeriodFromSearchParams>;
  adAccountId: string | null;
  skipCache: boolean;
  cacheOnly: boolean;
  debug: boolean;
  t0: number;
  ctxToken?: string;
}) {
  const { period, tenantId, adAccountId, skipCache, cacheOnly, debug, t0, ctxToken } = input;

  if (!period.since || !period.until) {
    return NextResponse.json({ ok: true, groups: [], allClients: true });
  }

  const clients = await listClientsForTenant(tenantId);
  if (!clients.length) {
    return NextResponse.json({ ok: true, groups: [], allClients: true });
  }

  const rankConfig = await loadRankConfig(tenantId);
  const periodDays = resolvedPeriodDays({
    preset: period.preset ?? "thisWeek",
    since: period.since,
    until: period.until,
    days: period.days ?? null,
    allTime: period.allTime ?? false
  });

  const tFetch = Date.now();
  const tokens = await getAllTenantMetaTokens(tenantId, ctxToken);
  const results = await Promise.all(
    clients.map(async (client) => {
      const clientParam = slugify(client.name);
      const { adAccount: adAccountRepo } = await repositories();
      let accounts = await adAccountRepo.find({ where: { clientId: client.id } });
      if (adAccountId) {
        accounts = accounts.filter(
          (a) => a.metaAdAccountId === adAccountId || a.id === adAccountId
        );
      }
      if (!accounts.length) return { creatives: [], warnings: [] as CreativeAccessWarning[], partialData: false };

      const { results: perAccount, warnings, partialData } = await fetchAllAccountCreatives(accounts, {
        tokens,
        since: period.since!,
        until: period.until!,
        tenantId,
        clientId: client.id,
        skipCache,
        cacheOnly,
        debug
      });

      const perf = await loadClientCreativesPerformance({
        tenantId,
        clientParam,
        adAccountId,
        since: period.since!,
        until: period.until!,
        period,
        skipCache,
        perAccount
      });

      return { creatives: perf.creatives, warnings, partialData };
    })
  );
  const fetchMs = Date.now() - tFetch;

  const creativeChunks = results.map((r) => r.creatives).filter((c) => c.length > 0);
  const groups = mergeCreativesIntoGroups(creativeChunks, rankConfig, { periodDays });
  const warnings = results.flatMap((r) => r.warnings);
  const partialData = results.some((r) => r.partialData);

  const cacheTtlSec = getCreativesCacheTtlSec();
  const dataProvenance = {
    source: "mixed" as const,
    fetchedAt: new Date().toISOString(),
    cacheTtlSec,
    cacheHits: 0,
    partialData
  };

  const res = NextResponse.json({
    ok: true,
    groups,
    allClients: true,
    warnings,
    partialData,
    dataSource: "mixed",
    dataProvenance
  });
  res.headers.set("X-Data-Source", "mixed");
  res.headers.set("X-Cache-TTL-Sec", String(cacheTtlSec));
  return applyServerTiming(res, { total: Date.now() - t0, meta: fetchMs });
}
