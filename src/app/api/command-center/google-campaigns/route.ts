import { NextResponse } from "next/server";
import { Between, In } from "typeorm";

import { repositories } from "@/db/repositories";
import { getAppContext, listClientsForTenant, slugify } from "@/lib/app-context";
import { isGoogleAdsEnabled } from "@/lib/google-env";
import { parsePeriodFromSearchParams } from "@/lib/report-period";

function isoDay(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/**
 * Campanhas Google Ads do tenant (todos os clientes), lidas dos snapshots.
 * Espelha /api/command-center/campaigns (Meta) para o hub de Campanhas.
 */
export async function GET(req: Request) {
  if (!isGoogleAdsEnabled()) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const { tenant } = await getAppContext();
  const clients = await listClientsForTenant(tenant.id);
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const clientIds = clients.map((c) => c.id);
  if (!clientIds.length) return NextResponse.json({ ok: true, rows: [] });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  // Respeita o filtro de período do hub (period/since/until/days); all-time = sem recorte de data.
  const parsed = parsePeriodFromSearchParams(url);
  const dayFilter = parsed.allTime
    ? undefined
    : Between(parsed.since ?? isoDay(parsed.days ?? 90), parsed.until ?? isoDay(0));

  const { googleCampaignMetricSnapshot: repo } = await repositories();
  const snaps = await repo.find({
    where: { clientId: In(clientIds), ...(dayFilter ? { day: dayFilter } : {}) }
  });

  type Agg = {
    campaignId: string;
    clientId: string;
    name: string;
    spend: number;
    conversions: number;
    convValue: number;
    latestDay: string;
  };
  const byKey = new Map<string, Agg>();
  for (const s of snaps) {
    const key = `${s.clientId}:${s.campaignId}`;
    let a = byKey.get(key);
    if (!a) {
      a = {
        campaignId: s.campaignId,
        clientId: s.clientId,
        name: s.campaignName ?? s.campaignId,
        spend: 0,
        conversions: 0,
        convValue: 0,
        latestDay: ""
      };
      byKey.set(key, a);
    }
    a.spend += Number(s.cost);
    a.conversions += Number(s.conversions);
    a.convValue += Number(s.conversionsValue);
    if (s.day > a.latestDay) {
      a.latestDay = s.day;
      if (s.campaignName) a.name = s.campaignName;
    }
  }

  let rows = [...byKey.values()].map((a) => {
    const client = clientById.get(a.clientId);
    const clientName = client?.name ?? "";
    return {
      platform: "google" as const,
      campaignId: a.campaignId,
      campaignName: a.name,
      clientName,
      clientSlug: client ? slugify(client.name) : "",
      accountLabel: "Google Ads",
      spend: a.spend,
      conversions: a.conversions,
      cpa: a.conversions > 0 ? a.spend / a.conversions : null,
      roas: a.spend > 0 && a.convValue > 0 ? a.convValue / a.spend : 0
    };
  });

  if (q) {
    rows = rows.filter(
      (r) => r.campaignName.toLowerCase().includes(q) || r.clientName.toLowerCase().includes(q)
    );
  }
  rows.sort((x, y) => y.spend - x.spend);

  return NextResponse.json({ ok: true, rows });
}
