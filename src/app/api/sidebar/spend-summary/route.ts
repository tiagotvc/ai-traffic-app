import { NextResponse } from "next/server";

import { apiErrorResponse, requireAppShellContext } from "@/lib/api-auth";
import { loadMetricTotals, resolveDashboardScope } from "@/lib/dashboard-query";
import { todayIso } from "@/lib/report-period";

function mtdComparisonRanges() {
  const today = todayIso();
  const [y, m, d] = today.split("-").map(Number);

  const curSince = `${y}-${String(m).padStart(2, "0")}-01`;
  const curUntil = today;

  const prevMonth = m === 1 ? 12 : m - 1;
  const prevYear = m === 1 ? y - 1 : y;
  const lastDayPrev = new Date(prevYear, prevMonth, 0).getDate();
  const prevDay = Math.min(d, lastDayPrev);
  const prevSince = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
  const prevUntil = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(prevDay).padStart(2, "0")}`;

  return { curSince, curUntil, prevSince, prevUntil };
}

export async function GET() {
  try {
    const { tenant } = await requireAppShellContext();
    const { accountIds } = await resolveDashboardScope(tenant.id, null, null);

    if (!accountIds.length) {
      return NextResponse.json({
        ok: true,
        hasData: false,
        currentSpend: 0,
        previousSpend: 0,
        changePct: null,
        savings: 0
      });
    }

    const { curSince, curUntil, prevSince, prevUntil } = mtdComparisonRanges();

    const [current, previous] = await Promise.all([
      loadMetricTotals(accountIds, 31, { since: curSince, until: curUntil }),
      loadMetricTotals(accountIds, 31, { since: prevSince, until: prevUntil })
    ]);

    const currentSpend = current.spend;
    const previousSpend = previous.spend;
    const changePct =
      previousSpend > 0 ? ((currentSpend - previousSpend) / previousSpend) * 100 : null;
    const savings = Math.max(0, previousSpend - currentSpend);

    return NextResponse.json({
      ok: true,
      hasData: currentSpend > 0 || previousSpend > 0,
      currentSpend,
      previousSpend,
      changePct,
      savings
    });
  } catch (err) {
    return apiErrorResponse(err, "api/sidebar/spend-summary");
  }
}
