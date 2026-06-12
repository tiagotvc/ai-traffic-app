import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";
import { resolveMetaTokensForApi } from "@/lib/campaign-detail-api";
import { fetchAdSetInsights, fetchAdSetsForCampaign, type MetaAdSetInsight } from "@/lib/meta-graph";
import { type MetricKey } from "@/lib/dashboard-metrics";
import { parsePeriodFromSearchParams, rollingDaysEndingYesterday, yesterdayIso } from "@/lib/report-period";

function metricsFromInsight(m: MetaAdSetInsight | null): Partial<Record<MetricKey, number>> {
  const spend = m?.spend ?? 0;
  const impressions = m?.impressions ?? 0;
  const clicks = m?.clicks ?? 0;
  const reach = m?.reach ?? 0;
  const conversions = m?.conversions ?? 0;
  const messages = m?.messages ?? 0;
  return {
    spend,
    impressions,
    clicks,
    reach,
    conversions,
    messages,
    ctr: m?.ctr ?? (impressions > 0 ? (clicks / impressions) * 100 : 0),
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    cpa: conversions > 0 ? spend / conversions : 0,
    cpmsg: messages > 0 ? spend / messages : 0,
    frequency: reach > 0 ? impressions / reach : 0,
    roas: m?.roas ?? 0
  };
}

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
            ctr: insights?.ctr ?? 0,
            metrics: metricsFromInsight(insights)
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

  const { campaignPreset: presetRepo } = await repositories();
  const presetRow = await presetRepo.findOne({
    where: { tenantId: tenant.id, metaCampaignId }
  });
  const preset = presetRow?.preset ?? "default";

  const adsets = await loadAdSets(
    metaCampaignId,
    since,
    until,
    metaAccessToken ?? undefined,
    fallbackMetaToken
  );

  return NextResponse.json({ ok: true, adsets, preset });
}
