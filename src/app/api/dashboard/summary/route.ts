import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import {
  inventoryTimezoneMap,
  loadMetricRows,
  parseDashboardSearchParams,
  resolveDashboardScope
} from "@/lib/dashboard-query";

export async function GET(req: Request) {
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
        conversions: 0,
        roas: 0,
        cpa: 0,
        cpl: 0
      },
      adAccounts: []
    });
  }

  const allRows = await loadMetricRows(accountIds, days, {
    since: period.since,
    until: period.until,
    allTime: period.allTime
  });

  let spend = 0;
  let impressions = 0;
  let clicks = 0;
  let conversions = 0;
  let roasSum = 0;
  let roasCount = 0;

  for (const r of allRows) {
    spend += Number(r.spend) || 0;
    impressions += Number(r.impressions) || 0;
    clicks += Number(r.clicks) || 0;
    conversions += Number(r.conversions) || 0;
    const roas = Number(r.roas);
    if (!Number.isNaN(roas) && roas > 0) {
      roasSum += roas;
      roasCount += 1;
    }
  }

  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const roas = roasCount > 0 ? roasSum / roasCount : 0;
  const cpa = conversions > 0 ? spend / conversions : 0;

  const tzMap = await inventoryTimezoneMap(tenant.id);

  return NextResponse.json({
    ok: true,
    summary: { spend, impressions, clicks, ctr, cpc, conversions, roas, cpa, cpl: 0 },
    adAccounts: adAccounts.map((a) => ({
      id: a.id,
      metaAdAccountId: a.metaAdAccountId,
      label: a.label ?? a.metaAdAccountId,
      timezone: tzMap.get(a.metaAdAccountId) ?? null
    }))
  });
}
