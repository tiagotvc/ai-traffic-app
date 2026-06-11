import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId, slugify } from "@/lib/app-context";
import { resolveMetaTokensForApi } from "@/lib/campaign-detail-api";
import {
  fetchAdInsightsForAccount,
  fetchAdsWithUsageForAccount,
  type AdInsightMetrics,
  type CreativeAssetType
} from "@/lib/meta-graph";
import { METRIC_BY_KEY, formatMetricValue, type MetricKey } from "@/lib/dashboard-metrics";
import { presetMetricsFor } from "@/lib/campaign-presets";

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
  const clientIdParam = new URL(req.url).searchParams.get("clientId");
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
  const token = metaAccessToken ?? fallbackMetaToken ?? undefined;
  if (!token) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const { adAccount: adAccountRepo, campaignPreset: presetRepo } = await repositories();
  const accounts = await adAccountRepo.find({ where: { clientId: client.id } });
  const presetRows = await presetRepo.find({ where: { tenantId: tenant.id } });
  const presetByCampaign = new Map(presetRows.map((r) => [r.metaCampaignId, r.preset]));

  const byCreative = new Map<string, Agg>();

  for (const acc of accounts) {
    let ads: Awaited<ReturnType<typeof fetchAdsWithUsageForAccount>> = [];
    let insights: Map<string, AdInsightMetrics> = new Map();
    try {
      [ads, insights] = await Promise.all([
        fetchAdsWithUsageForAccount(token, acc.metaAdAccountId),
        fetchAdInsightsForAccount(token, acc.metaAdAccountId)
      ]);
    } catch {
      continue;
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
  const maxSpend = Math.max(1, ...aggs.map((a) => a.spend));

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

    const primary = presetMetricsFor(dominantPreset)[0];
    const metricLabel = `${formatMetricValue(primary, metrics[primary] ?? 0, "pt-BR")} · ${METRIC_BY_KEY[primary].label.toUpperCase()}`;

    const ratio = a.spend / maxSpend;
    const performance: "very_high" | "high" | "medium" | "low" =
      ratio >= 0.66 ? "very_high" : ratio >= 0.33 ? "high" : ratio > 0 ? "medium" : "low";

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
      dominantPreset,
      metrics
    };
  });

  rows.sort((x, y) => y.usageAds - x.usageAds);

  return NextResponse.json({ ok: true, rows, total: rows.length });
}
