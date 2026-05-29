import { NextResponse } from "next/server";
import { Between } from "typeorm";

import { repositories } from "@/db/repositories";
import { getAppContext, slugify } from "@/lib/app-context";
import { fetchCampaign } from "@/lib/meta-graph";
import { num } from "@/lib/goal-types";

function dateNDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ metaCampaignId: string }> }
) {
  const { metaCampaignId } = await params;
  const { metaAccessToken } = await getAppContext();
  const { campaignMetricSnapshot: campRepo, adAccount: adRepo, client: clientRepo, clientMetaSettings: settingsRepo } =
    await repositories();

  const since = dateNDaysAgo(7);
  const today = new Date().toISOString().slice(0, 10);
  const snaps = await campRepo.find({
    where: { metaCampaignId, day: Between(since, today) }
  });

  let spend = 0;
  let conversions = 0;
  let leads = 0;
  let impressions = 0;
  let clicks = 0;
  let roasSum = 0;
  let roasN = 0;
  for (const s of snaps) {
    spend += num(s.spend);
    conversions += num(s.conversions);
    leads += num(s.leads);
    impressions += num(s.impressions);
    clicks += num(s.clicks);
    const roas = num(s.roas);
    if (roas > 0) {
      roasSum += roas;
      roasN += 1;
    }
  }

  const latest = snaps.sort((a, b) => b.day.localeCompare(a.day))[0];
  let clientSlug = "";
  let clientName = "—";
  let accountLabel = "—";
  let metaAdAccountId = "";
  let objective = "leads";

  if (latest?.adAccountId) {
    const acc = await adRepo.findOne({ where: { id: latest.adAccountId } });
    if (acc) {
      metaAdAccountId = acc.metaAdAccountId;
      accountLabel = acc.label ?? acc.metaAdAccountId;
      const client = await clientRepo.findOne({ where: { id: acc.clientId } });
      if (client) {
        clientName = client.name;
        clientSlug = slugify(client.name);
        const settings = await settingsRepo.findOne({ where: { clientId: client.id } });
        if (settings?.defaultObjective) objective = settings.defaultObjective;
      }
    }
  }

  let live = null;
  if (metaAccessToken) {
    try {
      live = await fetchCampaign(metaAccessToken, metaCampaignId);
    } catch {
      live = null;
    }
  }

  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

  return NextResponse.json({
    ok: true,
    campaign: {
      id: metaCampaignId,
      name: live?.name ?? snaps[0]?.campaignName ?? metaCampaignId,
      status: live?.status ?? "UNKNOWN",
      dailyBudget: live?.daily_budget ? Number(live.daily_budget) / 100 : null,
      clientSlug,
      clientName,
      accountLabel,
      metaAdAccountId,
      objective,
      kpis: {
        spend,
        conversions,
        leads,
        impressions,
        clicks,
        ctr,
        roas: roasN ? roasSum / roasN : 0,
        cpl: leads > 0 ? spend / leads : null,
        cpa: conversions > 0 ? spend / conversions : null
      }
    }
  });
}
