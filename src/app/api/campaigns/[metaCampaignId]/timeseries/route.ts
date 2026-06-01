import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { resolveMetaTokensForApi } from "@/lib/campaign-detail-api";
import { getCampaignTimeseries } from "@/lib/campaign-detail-query";
import { parsePeriodFromSearchParams } from "@/lib/report-period";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ metaCampaignId: string }> }
) {
  const { metaCampaignId } = await params;
  const { tenant, user, metaAccessToken: ctxToken } = await getAppContext();
  const period = parsePeriodFromSearchParams(new URL(req.url));
  const { metaAccessToken, fallbackMetaToken } = await resolveMetaTokensForApi(
    tenant.id,
    user.id,
    ctxToken
  );

  const { series, previous } = await getCampaignTimeseries({
    metaCampaignId,
    period,
    metaAccessToken,
    fallbackMetaToken
  });

  return NextResponse.json({ ok: true, series, previous });
}
