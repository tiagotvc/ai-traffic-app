import { NextResponse } from "next/server";

import {
  loadMetricSeriesByDay,
  parseDashboardSearchParams,
  resolveDashboardScope
} from "@/lib/dashboard-query";
import { normalizeDayKey } from "@/lib/report-period";
import {
  enforceViewClientScope,
  resolveDashboardDataAuth
} from "@/lib/dashboard/view-data-auth";

export const maxDuration = 30;

export async function GET(req: Request) {
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

  const { accountIds } = await resolveDashboardScope(auth.tenantId, clientId, adAccountId);
  if (!accountIds.length) return NextResponse.json({ ok: true, series: [] });

  const rows = await loadMetricSeriesByDay(accountIds, days, {
    since: period.since,
    until: period.until,
    allTime: period.allTime
  });

  const series = rows.map((d) => ({
    day: normalizeDayKey(d.day),
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
