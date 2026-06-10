import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { loadMetricRows, parseDashboardSearchParams, resolveDashboardScope } from "@/lib/dashboard-query";

export async function GET(req: Request) {
  const { tenant } = await getAppContext();
  const url = new URL(req.url);
  const { clientId, adAccountId, days, period } = parseDashboardSearchParams(url);

  const { accountIds } = await resolveDashboardScope(tenant.id, clientId, adAccountId);
  if (!accountIds.length) return NextResponse.json({ ok: true, series: [] });

  const rows = await loadMetricRows(accountIds, days, {
    since: period.since,
    until: period.until,
    allTime: period.allTime
  });

  type Acc = {
    day: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    reach: number;
    messages: number;
    roas: number;
    roasCount: number;
  };
  const byDay = new Map<string, Acc>();

  for (const r of rows) {
    const row = r as typeof r & { reach?: string | number; messages?: string | number };
    const cur =
      byDay.get(r.day) ??
      ({
        day: r.day,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        reach: 0,
        messages: 0,
        roas: 0,
        roasCount: 0
      } satisfies Acc);
    cur.spend += Number(r.spend) || 0;
    cur.impressions += Number(r.impressions) || 0;
    cur.clicks += Number(r.clicks) || 0;
    cur.conversions += Number(r.conversions) || 0;
    cur.reach += Number(row.reach) || 0;
    cur.messages += Number(row.messages) || 0;
    const roas = Number(r.roas);
    if (!Number.isNaN(roas) && roas > 0) {
      cur.roas += roas;
      cur.roasCount += 1;
    }
    byDay.set(r.day, cur);
  }

  const series = [...byDay.values()]
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((d) => ({
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
      roas: d.roasCount ? d.roas / d.roasCount : 0
    }));

  return NextResponse.json({ ok: true, series });
}
