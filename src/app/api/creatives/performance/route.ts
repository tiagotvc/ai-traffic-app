import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId, slugify } from "@/lib/app-context";
import { getAllTenantMetaTokens } from "@/lib/meta-auth-store";
import { type AdInsightMetrics, type CreativeAssetType } from "@/lib/meta-graph";
import {
  fetchAdsForAccountAnyToken,
  fetchInsightsForAccountAnyToken,
  getSyncedCampaignIds,
  loadAdsViaCampaigns
} from "@/lib/creatives-data";
import { type MetricKey } from "@/lib/dashboard-metrics";
import { parsePeriodFromSearchParams } from "@/lib/report-period";
import { bestEligible, compareByRank, meetsMinActivity, rankSpecFor } from "@/lib/creative-ranking";
import { loadRankConfig } from "@/lib/ranking-config";

// Ranking CENTRADO NO CRIATIVO (arquivo): dedup por mediaKey, metricas globais,
// agrupado por tipo, com breakdown por campanha para comparacao.
export const maxDuration = 60;

type Sums = {
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  conversions: number;
  messages: number;
  roasSum: number;
  roasCount: number;
};
function newSums(): Sums {
  return { spend: 0, impressions: 0, clicks: 0, reach: 0, conversions: 0, messages: 0, roasSum: 0, roasCount: 0 };
}
function addInsight(s: Sums, m: AdInsightMetrics) {
  s.spend += m.spend;
  s.impressions += m.impressions;
  s.clicks += m.clicks;
  s.reach += m.reach;
  s.conversions += m.conversions;
  s.messages += m.messages;
  if (m.roas > 0) {
    s.roasSum += m.roas;
    s.roasCount += 1;
  }
}
function metricsOf(s: Sums): Partial<Record<MetricKey, number>> {
  return {
    spend: s.spend,
    impressions: s.impressions,
    clicks: s.clicks,
    reach: s.reach,
    conversions: s.conversions,
    messages: s.messages,
    ctr: s.impressions > 0 ? (s.clicks / s.impressions) * 100 : 0,
    cpc: s.clicks > 0 ? s.spend / s.clicks : 0,
    cpm: s.impressions > 0 ? (s.spend / s.impressions) * 1000 : 0,
    cpa: s.conversions > 0 ? s.spend / s.conversions : 0,
    cpmsg: s.messages > 0 ? s.spend / s.messages : 0,
    frequency: s.reach > 0 ? s.impressions / s.reach : 0,
    roas: s.roasCount ? s.roasSum / s.roasCount : 0
  };
}

type CampBreak = { id: string; name: string; sums: Sums; ads: Set<string> };
type AdsetBreak = { id: string; name: string; campaignName: string; sums: Sums; ads: Set<string> };
type Agg = {
  name: string;
  type: CreativeAssetType;
  thumbnailUrl?: string;
  imageUrl?: string;
  firstAdId?: string;
  sums: Sums;
  ads: Set<string>;
  campaigns: Map<string, string>;
  adsets: Map<string, string>;
  campaignIds: string[];
  anyActive: boolean;
  perCampaign: Map<string, CampBreak>;
  perAdset: Map<string, AdsetBreak>;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientIdParam = url.searchParams.get("clientId");
  const period = parsePeriodFromSearchParams(url);
  const { tenant, metaAccessToken: ctxToken } = await getAppContext();

  if (!clientIdParam) return NextResponse.json({ ok: true, groups: [] });
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
  const diag: Array<Record<string, unknown>> = [];
  const { adAccount: adAccountRepo, campaignPreset: presetRepo } = await repositories();
  let accounts = await adAccountRepo.find({ where: { clientId: client.id } });
  if (adAccountId) {
    accounts = accounts.filter((a) => a.metaAdAccountId === adAccountId || a.id === adAccountId);
  }
  const presetRows = await presetRepo.find({ where: { tenantId: tenant.id } });
  const presetByCampaign = new Map(presetRows.map((r) => [r.metaCampaignId, r.preset]));
  const rankConfig = await loadRankConfig(tenant.id);

  const byCreative = new Map<string, Agg>();
  const warnings: Array<{ account: string; label: string }> = [];

  for (const acc of accounts) {
    const accRes = await fetchAdsForAccountAnyToken(tokens, acc.metaAdAccountId);
    let ads = accRes.ads;
    let insights: Map<string, AdInsightMetrics>;
    if (accRes.ok) {
      insights = ads.length
        ? await fetchInsightsForAccountAnyToken(tokens, acc.metaAdAccountId, {
            since: period.since,
            until: period.until
          })
        : new Map();
    } else {
      const campIds = await getSyncedCampaignIds(acc.id);
      const fb = await loadAdsViaCampaigns(tokens, campIds);
      ads = fb.ads;
      insights = fb.insights;
    }
    if (!accRes.ok && ads.length === 0 && accRes.errors > 0) {
      warnings.push({ account: acc.metaAdAccountId, label: acc.label ?? acc.metaAdAccountId });
    }
    if (debug) {
      diag.push({
        account: acc.metaAdAccountId,
        label: acc.label ?? null,
        ok: accRes.ok || ads.length > 0,
        viaCampaigns: !accRes.ok,
        tokenErrors: accRes.errors,
        adsTotal: ads.length,
        adsActiveCampaign: ads.filter((a) => a.campaignStatus === "ACTIVE").length,
        insightsRows: insights.size
      });
    }

    for (const ad of ads) {
      if (ad.campaignStatus !== "ACTIVE") continue;

      // Chave do ARQUIVO: prioriza a midia (video_id/image_hash); senao o criativo; senao o nome.
      const key =
        ad.mediaKey ??
        (ad.creativeId ? `c:${ad.creativeId}` : ad.creativeName ? `n:${ad.creativeName.trim()}` : ad.id);

      let agg = byCreative.get(key);
      if (!agg) {
        agg = {
          name: ad.creativeName?.trim() || ad.name?.trim() || key,
          type: ad.creativeType ?? "image",
          thumbnailUrl: ad.thumbnailUrl,
          imageUrl: ad.imageUrl,
          sums: newSums(),
          ads: new Set(),
          campaigns: new Map(),
          adsets: new Map(),
          campaignIds: [],
          anyActive: false,
          perCampaign: new Map(),
          perAdset: new Map()
        };
        byCreative.set(key, agg);
      }
      if (!agg.thumbnailUrl && ad.thumbnailUrl) agg.thumbnailUrl = ad.thumbnailUrl;
      if (!agg.imageUrl && ad.imageUrl) agg.imageUrl = ad.imageUrl;
      if (!agg.firstAdId || ad.status === "ACTIVE") agg.firstAdId = ad.id;
      agg.ads.add(ad.id);
      if (ad.campaignId) {
        agg.campaigns.set(ad.campaignId, ad.campaignName ?? ad.campaignId);
        agg.campaignIds.push(ad.campaignId);
      }
      if (ad.adsetId) agg.adsets.set(ad.adsetId, ad.adsetName ?? ad.adsetId);
      if (ad.status === "ACTIVE") agg.anyActive = true;

      const m = insights.get(ad.id);
      if (m) {
        addInsight(agg.sums, m);
        if (ad.campaignId) {
          let cb = agg.perCampaign.get(ad.campaignId);
          if (!cb) {
            cb = { id: ad.campaignId, name: ad.campaignName ?? ad.campaignId, sums: newSums(), ads: new Set() };
            agg.perCampaign.set(ad.campaignId, cb);
          }
          addInsight(cb.sums, m);
          cb.ads.add(ad.id);
        }
        if (ad.adsetId) {
          let ab = agg.perAdset.get(ad.adsetId);
          if (!ab) {
            ab = {
              id: ad.adsetId,
              name: ad.adsetName ?? ad.adsetId,
              campaignName: ad.campaignName ?? "",
              sums: newSums(),
              ads: new Set()
            };
            agg.perAdset.set(ad.adsetId, ab);
          }
          addInsight(ab.sums, m);
          ab.ads.add(ad.id);
        }
      }
    }
  }

  const clientSlug = slugify(client.name);

  const creatives = [...byCreative.values()].map((a) => {
    const counts = new Map<string, number>();
    for (const cid of a.campaignIds) {
      const p = presetByCampaign.get(cid) ?? "default";
      counts.set(p, (counts.get(p) ?? 0) + 1);
    }
    let dominantPreset = "default";
    let best = -1;
    for (const [p, n] of counts) {
      if (n > best) {
        dominantPreset = p;
        best = n;
      }
    }

    const breakdown = [...a.perCampaign.values()]
      .map((cb) => ({
        campaignId: cb.id,
        campaignName: cb.name,
        adsCount: cb.ads.size,
        metrics: metricsOf(cb.sums)
      }))
      .sort((x, y) => Number(y.metrics.spend ?? 0) - Number(x.metrics.spend ?? 0));

    const breakdownAdsets = [...a.perAdset.values()]
      .map((ab) => ({
        adsetId: ab.id,
        adsetName: ab.name,
        campaignName: ab.campaignName,
        adsCount: ab.ads.size,
        metrics: metricsOf(ab.sums)
      }))
      .sort((x, y) => Number(y.metrics.spend ?? 0) - Number(x.metrics.spend ?? 0));

    return {
      key: a.name,
      name: a.name,
      type: a.type,
      adId: a.firstAdId ?? null,
      thumbnailUrl: a.thumbnailUrl ?? null,
      imageUrl: a.imageUrl ?? a.thumbnailUrl ?? null,
      status: a.anyActive ? "ACTIVE" : "PAUSED",
      adsCount: a.ads.size,
      clientSlug,
      dominantPreset,
      metrics: metricsOf(a.sums),
      campaigns: [...a.campaigns.entries()].map(([id, name]) => ({ id, name })),
      adsets: [...a.adsets.entries()].map(([id, name]) => ({ id, name })),
      breakdown,
      breakdownAdsets
    };
  });

  // Agrupa por TIPO (preset) e ranqueia por eficiencia dentro do tipo.
  const byPreset = new Map<string, typeof creatives>();
  for (const c of creatives) {
    const arr = byPreset.get(c.dominantPreset) ?? [];
    arr.push(c);
    byPreset.set(c.dominantPreset, arr);
  }

  const groups = [...byPreset.entries()]
    .map(([preset, list]) => {
      const spec = rankSpecFor(preset, rankConfig);
      const byEff = (a: (typeof list)[number], b: (typeof list)[number]) =>
        compareByRank(a.metrics, b.metrics, spec);
      const spentList = list.filter((c) => Number(c.metrics.spend ?? 0) > 0);
      const noSpend = list
        .filter((c) => Number(c.metrics.spend ?? 0) <= 0)
        .sort((a, b) => Number(b.metrics.impressions ?? 0) - Number(a.metrics.impressions ?? 0));
      // "Melhores": rodaram o suficiente (atividade minima + volume de resultado).
      const isBest = (c: (typeof list)[number]) =>
        meetsMinActivity(c.metrics, rankConfig) && bestEligible(c.metrics, preset);
      const best = spentList.filter(isBest).sort(byEff);
      // "Promissores": gastaram pouco mas ja vao bem (ainda sem volume p/ confiar).
      const promising = spentList.filter((c) => !isBest(c)).sort(byEff);
      const totalSpend = list.reduce((s, c) => s + Number(c.metrics.spend ?? 0), 0);
      return { preset, primaryMetric: spec.metric, totalSpend, best, promising, noSpend };
    })
    .filter((g) => g.best.length || g.promising.length || g.noSpend.length)
    .sort((a, b) => b.totalSpend - a.totalSpend);

  return NextResponse.json({ ok: true, groups, clientSlug, warnings, ...(debug ? { diag } : {}) });
}
