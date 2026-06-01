import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { fetchAdSetInsights, fetchAdSetsForCampaign } from "@/lib/meta-graph";
import { parsePeriodFromSearchParams } from "@/lib/report-period";

function resolveSinceUntil(period: ReturnType<typeof parsePeriodFromSearchParams>) {
  const today = new Date().toISOString().slice(0, 10);
  if (period.allTime) {
    const since = new Date();
    since.setFullYear(since.getFullYear() - 2);
    return { since: since.toISOString().slice(0, 10), until: today };
  }
  return { since: period.since ?? today, until: period.until ?? today };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ metaCampaignId: string }> }
) {
  const { metaCampaignId } = await params;
  const { metaAccessToken } = await getAppContext();
  if (!metaAccessToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const period = parsePeriodFromSearchParams(new URL(req.url));
  const { since, until } = resolveSinceUntil(period);

  const adsets = await fetchAdSetsForCampaign(metaAccessToken, metaCampaignId);
  const enriched = await Promise.all(
    adsets.map(async (a) => {
      const insights = await fetchAdSetInsights(metaAccessToken, a.id, since, until);
      const spend = insights?.spend ?? 0;
      const conversions = insights?.conversions ?? 0;
      return {
        id: a.id,
        name: a.name,
        status: a.status,
        dailyBudget: a.daily_budget ? Number(a.daily_budget) / 100 : null,
        spend,
        conversions,
        cpa: conversions > 0 ? spend / conversions : null,
        roas: insights?.roas ?? 0,
        reach: insights?.reach ?? 0,
        clicks: insights?.clicks ?? 0,
        ctr: insights?.ctr ?? 0
      };
    })
  );

  return NextResponse.json({ ok: true, adsets: enriched });
}
