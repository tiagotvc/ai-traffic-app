import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import {
  inventoryTimezoneMap,
  loadMetricTotals,
  parseDashboardSearchParams,
  resolveDashboardScope
} from "@/lib/dashboard-query";
import { applyServerTiming } from "@/lib/server-timing";

export const maxDuration = 30;

export async function GET(req: Request) {
  const t0 = Date.now();
  const { tenant } = await getAppContext();
  const url = new URL(req.url);
  const { clientId, adAccountId, days, period } = parseDashboardSearchParams(url);

  const { accountIds, adAccounts } = await resolveDashboardScope(tenant.id, clientId, adAccountId);

  if (!accountIds.length) {
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
  const totals = await loadMetricTotals(accountIds, days, {
    since: period.since,
    until: period.until,
    allTime: period.allTime
  });
  const dbMs = Date.now() - tDb;

  const { spend, impressions, clicks, conversions, reach, messages, roas } = totals;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
  const cpmsg = messages > 0 ? spend / messages : 0;
  const frequency = reach > 0 ? impressions / reach : 0;
  const cpa = conversions > 0 ? spend / conversions : 0;

  const tzMap = await inventoryTimezoneMap(tenant.id);

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
