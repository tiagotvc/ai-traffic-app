import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { loadAgeBreakdown } from "@/lib/dashboard-age-breakdown";
import { parseDashboardSearchParams } from "@/lib/dashboard-query";

export const maxDuration = 30;

export async function GET(req: Request) {
  const { tenant, user } = await getAppContext();
  const url = new URL(req.url);
  const { clientId, adAccountId, days } = parseDashboardSearchParams(url);

  const rows = await loadAgeBreakdown({
    tenantId: tenant.id,
    userId: user.id,
    clientId,
    adAccountId,
    days
  });

  return NextResponse.json({ ok: true, rows });
}
