import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId, slugify } from "@/lib/app-context";
import { getAllTenantMetaTokens } from "@/lib/meta-auth-store";
import { fetchAllAccountCreatives } from "@/lib/creatives-access";
import { parsePeriodFromSearchParams, resolvedPeriodDays } from "@/lib/report-period";
import { loadRankConfig } from "@/lib/ranking-config";
import {
  aggregateCreativesFromAccountData,
  getTopCreativesByPreset,
  mapAggregatesToCreatives,
  type CreativeAgg
} from "@/lib/agency-brain/creative-intelligence";
import { getCreativesCacheTtlSec } from "@/lib/creatives-cache";
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
  const { adAccount: adAccountRepo, campaignPreset: presetRepo } = await repositories();
  let accounts = await adAccountRepo.find({ where: { clientId: client.id } });
  if (adAccountId) {
    accounts = accounts.filter((a) => a.metaAdAccountId === adAccountId || a.id === adAccountId);
  }
  const presetRows = await presetRepo.find({ where: { tenantId: tenant.id } });
  const presetByCampaign = new Map(presetRows.map((r) => [r.metaCampaignId, r.preset]));
  const rankConfig = await loadRankConfig(tenant.id);

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

  const clientSlug = slugify(client.name);
  const byCreative = new Map<string, CreativeAgg>();

  for (const { ads, insights } of perAccount) {
    aggregateCreativesFromAccountData({
      ads,
      insights,
      clientSlug,
      presetByCampaign,
      into: byCreative
    });
  }

  const creatives = mapAggregatesToCreatives(byCreative, clientSlug, presetByCampaign);
  const periodDays = resolvedPeriodDays(period);
  const groups = getTopCreativesByPreset(creatives, rankConfig, { periodDays });

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
    clientSlug,
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
