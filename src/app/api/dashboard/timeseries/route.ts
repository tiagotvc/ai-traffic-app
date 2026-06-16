import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import {
  loadMetricSeriesByDay,
  parseDashboardSearchParams,
  resolveDashboardScope
} from "@/lib/dashboard-query";

export const maxDuration = 30;

export async function GET(req: Request) {
  const { tenant } = await getAppContext();
  const url = new URL(req.url);
  const { clientId, adAccountId, days, period } = parseDashboardSearchParams(url);

  const { accountIds } = await resolveDashboardScope(tenant.id, clientId, adAccountId);
  if (!accountIds.length) return NextResponse.json({ ok: true, series: [] });

  const rows = await loadMetricSeriesByDay(accountIds, days, {
    since: period.since,
    until: period.until,
    allTime: period.allTime
  });

  const series = rows.map((d) => ({
    day: d.day,
    spend: d.spend,
    impressions: d.impressions,
    clicks: d.clicks,
    conversions: d.conversions,
    reach: d.reach,
    messages: d.messages,
    ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
    cpc: d.clicks > 0 ? d.spend / d.clicks : 0,
    cpm: d.impressions > 0 ? (d.spend / d.impressions) * 1000 : 0,
    cpa: d.conversions > 0 ? d.spend / d.conversions : 0,
    cpmsg: d.messages > 0 ? d.spend / d.messages : 0,
    frequency: d.reach > 0 ? d.impressions / d.reach : 0,
    roas: d.roas
  }));

  return NextResponse.json({ ok: true, series });
}
