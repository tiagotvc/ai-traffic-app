import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { getAllTenantMetaTokens } from "@/lib/meta-auth-store";
import { type AdInsightMetrics, type CreativeAssetType } from "@/lib/meta-graph";
import { fetchAllAccountCreatives } from "@/lib/creatives-access";
import { type MetricKey } from "@/lib/dashboard-metrics";
import { parsePeriodFromSearchParams } from "@/lib/report-period";
import { compareByRank, meetsMinActivity, rankSpecFor } from "@/lib/creative-ranking";
import { loadRankConfig } from "@/lib/ranking-config";

export const maxDuration = 60;

const TOP_PER_CAMPAIGN = 6;

type CreAgg = {
  name: string;
  type: CreativeAssetType;
  thumbnailUrl?: string;
  imageUrl?: string;
  firstAdId?: string;
  ads: Set<string>;
  anyActive: boolean;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  conversions: number;
  messages: number;
  roasSum: number;
  roasCount: number;
};
type CampAgg = {
  id: string;
  name: string;
  spend: number;
  creatives: Map<string, CreAgg>;
};

function metricsOf(a: CreAgg): Partial<Record<MetricKey, number>> {
  return {
    spend: a.spend,
    impressions: a.impressions,
    clicks: a.clicks,
    reach: a.reach,
    conversions: a.conversions,
    messages: a.messages,
    ctr: a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0,
    cpc: a.clicks > 0 ? a.spend / a.clicks : 0,
    cpm: a.impressions > 0 ? (a.spend / a.impressions) * 1000 : 0,
    cpa: a.conversions > 0 ? a.spend / a.conversions : 0,
    cpmsg: a.messages > 0 ? a.spend / a.messages : 0,
    frequency: a.reach > 0 ? a.impressions / a.reach : 0,
    roas: a.roasCount ? a.roasSum / a.roasCount : 0
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientIdParam = url.searchParams.get("clientId");
  const period = parsePeriodFromSearchParams(url);
  const { tenant, metaAccessToken: ctxToken } = await getAppContext();

  if (!clientIdParam) return NextResponse.json({ ok: true, campaigns: [] });
  const client = await getClientBySlugOrId(tenant.id, clientIdParam);
  if (!client) {
    return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
  }

  const tokens = await getAllTenantMetaTokens(tenant.id, ctxToken);
  if (!tokens.length) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const adAccountId = url.searchParams.get("adAccountId");
  const debug = url.searchParams.get("debug") === "1";
  const skipCache = url.searchParams.get("refresh") === "1";
  const { adAccount: adAccountRepo, campaignPreset: presetRepo } = await repositories();
  let accounts = await adAccountRepo.find({ where: { clientId: client.id } });
  if (adAccountId) {
    accounts = accounts.filter(
      (a) => a.metaAdAccountId === adAccountId || a.id === adAccountId
    );
  }
  const presetRows = await presetRepo.find({ where: { tenantId: tenant.id } });
  const presetByCampaign = new Map(presetRows.map((r) => [r.metaCampaignId, r.preset]));
  const rankConfig = await loadRankConfig(tenant.id);

  const byCampaign = new Map<string, CampAgg>();

  const { results: perAccount, warnings, partialData, dataSource } =
    await fetchAllAccountCreatives(accounts, {
      tokens,
      since: period.since,
      until: period.until,
      tenantId: tenant.id,
      clientId: client.id,
      skipCache,
      debug
    });

  const diag = debug
    ? perAccount.map((r) => r.diag).filter(Boolean) as Array<Record<string, unknown>>
    : [];

  for (const { ads, insights } of perAccount) {
    for (const ad of ads) {
      if (ad.campaignStatus !== "ACTIVE" || !ad.campaignId) continue;

      let camp = byCampaign.get(ad.campaignId);
      if (!camp) {
        camp = {
          id: ad.campaignId,
          name: ad.campaignName ?? ad.campaignId,
          spend: 0,
          creatives: new Map()
        };
        byCampaign.set(ad.campaignId, camp);
      }

      const key = ad.name?.trim() || ad.creativeName?.trim() || ad.creativeId || ad.id;
      let cre = camp.creatives.get(key);
      if (!cre) {
        cre = {
          name: ad.name?.trim() || ad.creativeName?.trim() || key,
          type: ad.creativeType ?? "image",
          thumbnailUrl: ad.thumbnailUrl,
          imageUrl: ad.imageUrl,
          ads: new Set(),
          anyActive: false,
          spend: 0,
          impressions: 0,
          clicks: 0,
          reach: 0,
          conversions: 0,
          messages: 0,
          roasSum: 0,
          roasCount: 0
        };
        camp.creatives.set(key, cre);
      }
      if (!cre.thumbnailUrl && ad.thumbnailUrl) cre.thumbnailUrl = ad.thumbnailUrl;
      if (!cre.imageUrl && ad.imageUrl) cre.imageUrl = ad.imageUrl;
      if (!cre.firstAdId || ad.status === "ACTIVE") cre.firstAdId = ad.id;
      cre.ads.add(ad.id);
      if (ad.status === "ACTIVE") cre.anyActive = true;

      const m = insights.get(ad.id);
      if (m) {
        cre.spend += m.spend;
        cre.impressions += m.impressions;
        cre.clicks += m.clicks;
        cre.reach += m.reach;
        cre.conversions += m.conversions;
        cre.messages += m.messages;
        if (m.roas > 0) {
          cre.roasSum += m.roas;
          cre.roasCount += 1;
        }
        camp.spend += m.spend;
      }
    }
  }

  const campaigns = [...byCampaign.values()]
    .map((camp) => {
      const preset = presetByCampaign.get(camp.id) ?? "default";
      const spec = rankSpecFor(preset, rankConfig);
      const all = [...camp.creatives.values()].map((a) => ({
        name: a.name,
        type: a.type,
        status: a.anyActive ? "ACTIVE" : "PAUSED",
        adId: a.firstAdId ?? null,
        adsCount: a.ads.size,
        thumbnailUrl: a.thumbnailUrl ?? null,
        imageUrl: a.imageUrl ?? a.thumbnailUrl ?? null,
        metrics: metricsOf(a)
      }));
      // Piso mínimo de atividade; se nada atinge, mostra todos (ranqueados por gasto).
      const qualified = all.filter((c) => meetsMinActivity(c.metrics, rankConfig));
      const ranked = qualified.length ? qualified : all;
      const creatives = ranked
        .sort((x, y) =>
          qualified.length
            ? compareByRank(x.metrics, y.metrics, spec)
            : Number(y.metrics.spend ?? 0) - Number(x.metrics.spend ?? 0)
        )
        .slice(0, TOP_PER_CAMPAIGN);
      return {
        campaignId: camp.id,
        campaignName: camp.name,
        preset,
        primaryMetric: spec.metric,
        rankBelowFloor: qualified.length === 0,
        spend: camp.spend,
        creatives
      };
    })
    .filter((c) => c.creatives.length > 0)
    .sort((a, b) => b.spend - a.spend);

  const res = NextResponse.json({
    ok: true,
    campaigns,
    warnings,
    partialData,
    dataSource,
    ...(debug ? { diag } : {})
  });
  res.headers.set("X-Data-Source", dataSource);
  return res;
}
