import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { resolveMetaTokensForApi } from "@/lib/campaign-detail-api";
import { fetchAdSetInsights, fetchAdSetsForCampaign } from "@/lib/meta-graph";
import { parsePeriodFromSearchParams, rollingDaysEndingYesterday, yesterdayIso } from "@/lib/report-period";

function resolveSinceUntil(period: ReturnType<typeof parsePeriodFromSearchParams>) {
  if (period.allTime) {
    const since = new Date();
    since.setFullYear(since.getFullYear() - 2);
    return { since: since.toISOString().slice(0, 10), until: yesterdayIso() };
  }
  const fallback = rollingDaysEndingYesterday(7);
  return {
    since: period.since ?? fallback.since,
    until: period.until ?? fallback.until
  };
}

async function loadAdSets(
  metaCampaignId: string,
  since: string,
  until: string,
  primaryToken?: string,
  fallbackToken?: string
) {
  for (const token of [primaryToken, fallbackToken]) {
    if (!token) continue;
    try {
      const adsets = await fetchAdSetsForCampaign(token, metaCampaignId);
      const enriched = await Promise.all(
        adsets.map(async (a) => {
          const insights = await fetchAdSetInsights(token, a.id, since, until);
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
      return enriched;
    } catch {
      /* try fallback token */
    }
  }
  return [];
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ metaCampaignId: string }> }
) {
  const { metaCampaignId } = await params;
  const { tenant, user, metaAccessToken: ctxToken } = await getAppContext();
  const { metaAccessToken, fallbackMetaToken } = await resolveMetaTokensForApi(
    tenant.id,
    user.id,
    ctxToken
  );

  if (!metaAccessToken && !fallbackMetaToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const period = parsePeriodFromSearchParams(new URL(req.url));
  const { since, until } = resolveSinceUntil(period);

  const adsets = await loadAdSets(
    metaCampaignId,
    since,
    until,
    metaAccessToken ?? undefined,
    fallbackMetaToken
  );

  return NextResponse.json({ ok: true, adsets });
}
