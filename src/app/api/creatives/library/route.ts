import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId, slugify } from "@/lib/app-context";
import { resolveMetaTokensForApi } from "@/lib/campaign-detail-api";
import { type AdInsightMetrics, type CreativeAssetType } from "@/lib/meta-graph";
import {
  fetchAdsForAccountAnyToken,
  fetchInsightsForAccountAnyToken
} from "@/lib/creatives-data";
import { METRIC_BY_KEY, formatMetricValue, type MetricKey } from "@/lib/dashboard-metrics";
import { parsePeriodFromSearchParams } from "@/lib/report-period";
import { compareByRank, meetsMinActivity, rankSpecFor } from "@/lib/creative-ranking";
import { loadRankConfig } from "@/lib/ranking-config";

export const maxDuration = 60;

const FORMAT_LABEL: Record<CreativeAssetType, string> = {
  image: "Imagem",
  video: "Vídeo",
  carousel: "Carrossel",
  copy: "Copy",
  headline: "Headline",
  description: "Descrição"
};

type Agg = {
  id: string;
  name: string;
  type: CreativeAssetType;
  thumbnailUrl?: string;
  imageUrl?: string;
  firstAdId?: string;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  conversions: number;
  messages: number;
  roasSum: number;
  roasCount: number;
  ads: Set<string>;
  campaigns: Set<string>;
  campaignIds: string[];
  anyActive: boolean;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientIdParam = url.searchParams.get("clientId");
  const period = parsePeriodFromSearchParams(url);
  const { tenant, user, metaAccessToken: ctxToken } = await getAppContext();

  if (!clientIdParam) return NextResponse.json({ ok: true, rows: [], total: 0 });
  const client = await getClientBySlugOrId(tenant.id, clientIdParam);
  if (!client) {
    return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
  }

  const { metaAccessToken, fallbackMetaToken } = await resolveMetaTokensForApi(
    tenant.id,
    user.id,
    ctxToken
  );
  const tokens = [metaAccessToken, fallbackMetaToken].filter(Boolean) as string[];
  if (!tokens.length) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const adAccountId = url.searchParams.get("adAccountId");
  const debug = url.searchParams.get("debug") === "1";
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

  const byCreative = new Map<string, Agg>();
  const diag: Array<Record<string, unknown>> = [];

  for (const acc of accounts) {
    const { ads, ok, errors } = await fetchAdsForAccountAnyToken(tokens, acc.metaAdAccountId);
    const insights: Map<string, AdInsightMetrics> = ads.length
      ? await fetchInsightsForAccountAnyToken(tokens, acc.metaAdAccountId, {
          since: period.since,
          until: period.until
        })
      : new Map();
    if (debug) {
      diag.push({
        account: acc.metaAdAccountId,
        label: acc.label ?? null,
        ok,
        tokenErrors: errors,
        adsTotal: ads.length,
        adsActiveCampaign: ads.filter((a) => a.campaignStatus === "ACTIVE").length
      });
    }

    for (const ad of ads) {
      // Apenas campanhas ativas.
      if (ad.campaignStatus !== "ACTIVE") continue;

      const key = ad.creativeName?.trim() || ad.name?.trim() || ad.creativeId || ad.id;
      let agg = byCreative.get(key);
      if (!agg) {
        agg = {
          id: ad.creativeId || key,
          name: ad.creativeName?.trim() || ad.name?.trim() || key,
          type: ad.creativeType ?? "image",
          thumbnailUrl: ad.thumbnailUrl,
          imageUrl: ad.imageUrl,
          spend: 0,
          impressions: 0,
          clicks: 0,
          reach: 0,
          conversions: 0,
          messages: 0,
          roasSum: 0,
          roasCount: 0,
          ads: new Set(),
          campaigns: new Set(),
          campaignIds: [],
          anyActive: false
        };
        byCreative.set(key, agg);
      }
      if (!agg.thumbnailUrl && ad.thumbnailUrl) agg.thumbnailUrl = ad.thumbnailUrl;
      if (!agg.imageUrl && ad.imageUrl) agg.imageUrl = ad.imageUrl;
      if (!agg.firstAdId || ad.status === "ACTIVE") agg.firstAdId = ad.id;
      agg.ads.add(ad.id);
      if (ad.campaignId) {
        agg.campaigns.add(ad.campaignName ?? ad.campaignId);
        agg.campaignIds.push(ad.campaignId);
      }
      if (ad.status === "ACTIVE") agg.anyActive = true;

      const m = insights.get(ad.id);
      if (m) {
        agg.spend += m.spend;
        agg.impressions += m.impressions;
        agg.clicks += m.clicks;
        agg.reach += m.reach;
        agg.conversions += m.conversions;
        agg.messages += m.messages;
        if (m.roas > 0) {
          agg.roasSum += m.roas;
          agg.roasCount += 1;
        }
      }
    }
  }

  const aggs = [...byCreative.values()];

  const rows = aggs.map((a) => {
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

    const metrics: Partial<Record<MetricKey, number>> = {
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

    const rankMetric = rankSpecFor(dominantPreset, rankConfig).metric;
    const metricLabel = `${formatMetricValue(rankMetric, metrics[rankMetric] ?? 0, "pt-BR")} · ${METRIC_BY_KEY[rankMetric].label.toUpperCase()}`;

    // performance é atribuída no segundo passo (eficiência por tipo + piso).
    const performance = "low" as "very_high" | "high" | "medium" | "low";

    const campaignList = [...a.campaigns];

    return {
      id: a.id,
      title: a.name,
      description: a.name,
      type: a.type,
      format: FORMAT_LABEL[a.type] ?? "Imagem",
      clientName: client.name,
      clientSlug: slugify(client.name),
      campaignName:
        campaignList.length > 1
          ? `${campaignList[0]} +${campaignList.length - 1}`
          : campaignList[0] ?? "—",
      status: (a.anyActive ? "active" : "paused") as "active" | "paused",
      performance,
      metricLabel,
      usageAds: a.ads.size,
      usageCampaigns: a.campaigns.size,
      thumbnailUrl: a.thumbnailUrl ?? null,
      imageUrl: a.imageUrl ?? a.thumbnailUrl ?? null,
      adId: a.firstAdId ?? null,
      dominantPreset,
      metrics
    };
  });

  // Performance por eficiência dentro de cada tipo (preset), com piso mínimo.
  const byPreset = new Map<string, typeof rows>();
  for (const r of rows) {
    const arr = byPreset.get(r.dominantPreset) ?? [];
    arr.push(r);
    byPreset.set(r.dominantPreset, arr);
  }
  for (const [preset, arr] of byPreset) {
    const spec = rankSpecFor(preset, rankConfig);
    const qualified = arr.filter((r) => meetsMinActivity(r.metrics, rankConfig));
    qualified.sort((x, y) => compareByRank(x.metrics, y.metrics, spec));
    const n = qualified.length;
    qualified.forEach((r, i) => {
      const pct = n <= 1 ? 0 : i / (n - 1); // 0 = melhor da categoria
      r.performance =
        pct <= 0.15 ? "very_high" : pct <= 0.4 ? "high" : pct <= 0.75 ? "medium" : "low";
    });
    arr.filter((r) => !meetsMinActivity(r.metrics, rankConfig)).forEach((r) => (r.performance = "low"));
  }

  // Melhores primeiro (por faixa de performance) e, em empate, por gasto.
  const perfOrder = { very_high: 0, high: 1, medium: 2, low: 3 } as const;
  rows.sort(
    (x, y) =>
      perfOrder[x.performance] - perfOrder[y.performance] ||
      Number(y.metrics.spend ?? 0) - Number(x.metrics.spend ?? 0)
  );

  return NextResponse.json({ ok: true, rows, total: rows.length, ...(debug ? { diag } : {}) });
}
