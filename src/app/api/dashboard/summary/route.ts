import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import {
  inventoryTimezoneMap,
  loadMetricRows,
  parseDashboardSearchParams,
  resolveDashboardScope
} from "@/lib/dashboard-query";
import { applyServerTiming } from "@/lib/server-timing";

export async function GET(req: Request) {
  const t0 = Date.now();
  let dbMs = 0;
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
  const allRows = await loadMetricRows(accountIds, days, {
    since: period.since,
    until: period.until,
    allTime: period.allTime
  });
  dbMs = Date.now() - tDb;

  let spend = 0;
  let impressions = 0;
  let clicks = 0;
  let conversions = 0;
  let reach = 0;
  let messages = 0;
  let roasSum = 0;
  let roasCount = 0;

  for (const r of allRows) {
    const row = r as typeof r & { reach?: string | number; messages?: string | number };
    spend += Number(r.spend) || 0;
    impressions += Number(r.impressions) || 0;
    clicks += Number(r.clicks) || 0;
    conversions += Number(r.conversions) || 0;
    reach += Number(row.reach) || 0;
    messages += Number(row.messages) || 0;
    const roas = Number(r.roas);
    if (!Number.isNaN(roas) && roas > 0) {
      roasSum += roas;
      roasCount += 1;
    }
  }

  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
  const cpmsg = messages > 0 ? spend / messages : 0;
  const frequency = reach > 0 ? impressions / reach : 0;
  const roas = roasCount > 0 ? roasSum / roasCount : 0;
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
