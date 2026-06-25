import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { parseCampaignDetailHints, resolveMetaTokensForApi } from "@/lib/campaign-detail-api";
import { getCampaignDetail } from "@/lib/campaign-detail-query";
import { parsePeriodFromSearchParams } from "@/lib/report-period";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ metaCampaignId: string }> }
) {
  const { metaCampaignId } = await params;
  const { tenant, user, metaAccessToken: ctxToken } = await getAppContext();
  const url = new URL(req.url);
  const period = parsePeriodFromSearchParams(url);
  const hints = parseCampaignDetailHints(url);
  const live = url.searchParams.get("live") === "1";
  const { metaAccessToken, fallbackMetaToken } = await resolveMetaTokensForApi(
    tenant.id,
    user.id,
    ctxToken
  );

  const { campaign } = await getCampaignDetail({
    metaCampaignId,
    period,
    tenantId: tenant.id,
    metaAccessToken,
    fallbackMetaToken,
    hints,
    live
  });

  return NextResponse.json({ ok: true, campaign });
}
