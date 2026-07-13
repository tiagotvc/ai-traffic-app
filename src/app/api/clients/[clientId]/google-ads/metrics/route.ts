import { NextResponse } from "next/server";
import { Between } from "typeorm";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { isGoogleAdsEnabled } from "@/lib/google-env";
import { googleRangeFromParams } from "@/lib/google-ads-range";

type Agg = {
  campaignId: string;
  name: string;
  status: string;
  channelType: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionsValue: number;
};

/**
 * Métricas de campanha Google Ads a partir dos snapshots (histórico, rápido).
 * Agrega por campanha no período (?since=&until= ou ?days=30). Só leitura.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  if (!isGoogleAdsEnabled()) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const { clientId } = await params;
  const { tenant } = await getAppContext();
  const client = await getClientBySlugOrId(tenant.id, clientId);
  if (!client) {
    return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
  }
  if (!client.googleAdsCustomerId) {
    return NextResponse.json({ ok: false, error: "not_linked" }, { status: 409 });
  }

  const url = new URL(req.url);
  const { since, until } = googleRangeFromParams(url);

  const { googleCampaignMetricSnapshot: snapRepo } = await repositories();
  const snaps = await snapRepo.find({
    where: { clientId: client.id, day: Between(since, until) }
  });

  // Agrega por campanha; nome/status/canal vêm do dia mais recente.
  const byId = new Map<string, Agg>();
  const latestDay = new Map<string, string>();
  for (const s of snaps) {
    let a = byId.get(s.campaignId);
    if (!a) {
      a = {
        campaignId: s.campaignId,
        name: s.campaignName ?? "",
        status: s.status ?? "",
        channelType: s.channelType ?? "",
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversions: 0,
        conversionsValue: 0
      };
      byId.set(s.campaignId, a);
    }
    a.impressions += Number(s.impressions);
    a.clicks += Number(s.clicks);
    a.cost += Number(s.cost);
    a.conversions += Number(s.conversions);
    a.conversionsValue += Number(s.conversionsValue);
    if (!latestDay.has(s.campaignId) || s.day > (latestDay.get(s.campaignId) as string)) {
      latestDay.set(s.campaignId, s.day);
      a.name = s.campaignName ?? a.name;
      a.status = s.status ?? a.status;
      a.channelType = s.channelType ?? a.channelType;
    }
  }

  const campaigns = [...byId.values()]
    .map((a) => ({
      ...a,
      ctr: a.impressions > 0 ? a.clicks / a.impressions : 0,
      averageCpc: a.clicks > 0 ? a.cost / a.clicks : 0
    }))
    .sort((x, y) => y.cost - x.cost);

  return NextResponse.json({ ok: true, count: campaigns.length, campaigns });
}
