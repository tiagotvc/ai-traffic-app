import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { getCampaignTimeseries } from "@/lib/campaign-detail-query";
import { parsePeriodFromSearchParams } from "@/lib/report-period";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ metaCampaignId: string }> }
) {
  const { metaCampaignId } = await params;
  const { metaAccessToken } = await getAppContext();
  const period = parsePeriodFromSearchParams(new URL(req.url));

  const { series, previous } = await getCampaignTimeseries({
    metaCampaignId,
    period,
    metaAccessToken
  });

  return NextResponse.json({ ok: true, series, previous });
}
