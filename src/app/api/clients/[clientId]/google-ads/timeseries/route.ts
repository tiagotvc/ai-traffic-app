import { NextResponse } from "next/server";
import { Between } from "typeorm";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { isGoogleAdsEnabled } from "@/lib/google-env";
import { googleRangeFromParams } from "@/lib/google-ads-range";

type DayPoint = {
  day: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionsValue: number;
  ctr: number;
  averageCpc: number;
};

/**
 * Série diária de uma campanha Google Ads, a partir dos snapshots (histórico, rápido).
 * Espelha o padrão do Meta (/api/campaigns/[id]/timeseries) para alimentar o gráfico
 * exclusivo da campanha. `?campaignId=` obrigatório; período `?since=&until=` ou `?days=`.
 * Só leitura.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  if (!isGoogleAdsEnabled()) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const { clientId } = await params;
  const url = new URL(req.url);
  const campaignId = (url.searchParams.get("campaignId") ?? "").replace(/\D/g, "");
  if (!campaignId) {
    return NextResponse.json({ ok: false, error: "campaignId obrigatório" }, { status: 400 });
  }

  const { tenant } = await getAppContext();
  const client = await getClientBySlugOrId(tenant.id, clientId);
  if (!client) {
    return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
  }
  if (!client.googleAdsCustomerId) {
    return NextResponse.json({ ok: false, error: "not_linked" }, { status: 409 });
  }

  const { since, until } = googleRangeFromParams(url);

  const { googleCampaignMetricSnapshot: snapRepo } = await repositories();
  const snaps = await snapRepo.find({
    where: { clientId: client.id, campaignId, day: Between(since, until) },
    order: { day: "ASC" }
  });

  // Um ponto por dia (snapshots já são únicos por (clientId, campaignId, day)).
  const series: DayPoint[] = snaps.map((s) => {
    const impressions = Number(s.impressions);
    const clicks = Number(s.clicks);
    const cost = Number(s.cost);
    return {
      day: s.day,
      impressions,
      clicks,
      cost,
      conversions: Number(s.conversions),
      conversionsValue: Number(s.conversionsValue),
      ctr: impressions > 0 ? clicks / impressions : 0,
      averageCpc: clicks > 0 ? cost / clicks : 0
    };
  });

  return NextResponse.json({ ok: true, count: series.length, series });
}
