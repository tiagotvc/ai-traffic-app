import { NextResponse } from "next/server";

import {
  inventoryTimezoneMap,
  loadGoogleMetricTotals,
  loadMetricTotals,
  mergeMetricTotals,
  parseDashboardSearchParams,
  resolveDashboardScope
} from "@/lib/dashboard-query";
import { applyServerTiming } from "@/lib/server-timing";
import {
  enforceViewClientScope,
  resolveDashboardDataAuth
} from "@/lib/dashboard/view-data-auth";

export const maxDuration = 30;

export async function GET(req: Request) {
  const t0 = Date.now();
  const auth = await resolveDashboardDataAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const url = new URL(req.url);
  let { clientId, adAccountId, days, period } = parseDashboardSearchParams(url);
  try {
    clientId = enforceViewClientScope(auth.viewAccess, clientId) ?? clientId;
  } catch {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { accountIds, adAccounts, clientIds } = await resolveDashboardScope(
    auth.tenantId,
    clientId,
    adAccountId
  );

  if (!accountIds.length && !clientIds.length) {
    return NextResponse.json({
      ok: true,
      summary: {
        spend: 0,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        cpc: 0,
        cpm: 0,
        conversions: 0,
        reach: 0,
        messages: 0,
        frequency: 0,
        roas: 0,
        cpa: 0,
        cpl: 0
      },
      adAccounts: []
    });
  }

  const tDb = Date.now();
  const rangeOpts = { since: period.since, until: period.until, allTime: period.allTime };
  // Filtro de plataforma (default "both"): zera o lado não selecionado passando escopo vazio.
  const platform = url.searchParams.get("platform") || "both";
  const metaAccountIds = platform === "google" ? [] : accountIds;
  const googleClientIds = platform === "meta" ? [] : clientIds;
  const [metaTotals, googleTotals] = await Promise.all([
    loadMetricTotals(metaAccountIds, days, rangeOpts),
    loadGoogleMetricTotals(googleClientIds, days, rangeOpts)
  ]);
  const totals = mergeMetricTotals(metaTotals, googleTotals);
  const dbMs = Date.now() - tDb;

  const { spend, impressions, clicks, conversions, reach, messages, roas } = totals;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
  const cpmsg = messages > 0 ? spend / messages : 0;
  const frequency = reach > 0 ? impressions / reach : 0;
  const cpa = conversions > 0 ? spend / conversions : 0;

  const tzMap = await inventoryTimezoneMap(auth.tenantId);

  const res = NextResponse.json({
    ok: true,
    summary: {
      spend,
      impressions,
      clicks,
      ctr,
      cpc,
      cpm,
      conversions,
      reach,
      messages,
      cpmsg,
      frequency,
      roas,
      cpa,
      cpl: 0
    },
    adAccounts: adAccounts.map((a) => ({
      id: a.id,
      metaAdAccountId: a.metaAdAccountId,
      label: a.label ?? a.metaAdAccountId,
      timezone: tzMap.get(a.metaAdAccountId) ?? null
    }))
  });
  return applyServerTiming(res, { total: Date.now() - t0, db: dbMs });
}
