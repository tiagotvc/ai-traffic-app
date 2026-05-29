import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { loadMetricRows, parseDashboardSearchParams, resolveDashboardScope } from "@/lib/dashboard-query";

export async function GET(req: Request) {
  const { tenant } = await getAppContext();
  const url = new URL(req.url);
  const { clientId, adAccountId, days } = parseDashboardSearchParams(url);

  const { accountIds } = await resolveDashboardScope(tenant.id, clientId, adAccountId);
  if (!accountIds.length) return NextResponse.json({ ok: true, series: [] });

  const rows = await loadMetricRows(accountIds, days);

  const byDay = new Map<
    string,
    { day: string; spend: number; conversions: number; roas: number; roasCount: number }
  >();

  for (const r of rows) {
    const cur = byDay.get(r.day) ?? { day: r.day, spend: 0, conversions: 0, roas: 0, roasCount: 0 };
    cur.spend += Number(r.spend) || 0;
    cur.conversions += Number(r.conversions) || 0;
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
      conversions: d.conversions,
      roas: d.roasCount ? d.roas / d.roasCount : 0
    }));

  return NextResponse.json({ ok: true, series });
}
