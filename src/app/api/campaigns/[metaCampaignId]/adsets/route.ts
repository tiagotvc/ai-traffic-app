import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { fetchAdSetInsights, fetchAdSetsForCampaign } from "@/lib/meta-graph";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ metaCampaignId: string }> }
) {
  const { metaCampaignId } = await params;
  const { metaAccessToken } = await getAppContext();
  if (!metaAccessToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const adsets = await fetchAdSetsForCampaign(metaAccessToken, metaCampaignId);
  const enriched = await Promise.all(
    adsets.map(async (a) => {
      const insights = await fetchAdSetInsights(metaAccessToken, a.id);
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
