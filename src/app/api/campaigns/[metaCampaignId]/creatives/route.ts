import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId, slugify } from "@/lib/app-context";
import { getAllTenantMetaTokens } from "@/lib/meta-auth-store";
import { type AdInsightMetrics, type CreativeAssetType } from "@/lib/meta-graph";
import {
  fetchAdsForCampaignAnyToken,
  fetchInsightsForCampaignAnyToken
} from "@/lib/creatives-data";
import { METRIC_BY_KEY, formatMetricValue, type MetricKey } from "@/lib/dashboard-metrics";
import { compareByRank, meetsMinActivity, rankSpecFor } from "@/lib/creative-ranking";
import { loadRankConfig } from "@/lib/ranking-config";

export const maxDuration = 60;

const FORMAT_LABELS: Record<CreativeAssetType, string> = {
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
  anyActive: boolean;
};

function metricsOf(a: Agg): Partial<Record<MetricKey, number>> {
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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ metaCampaignId: string }> }
) {
  const { metaCampaignId } = await params;
  const clientSlugParam = new URL(req.url).searchParams.get("clientSlug") || "";
  const { tenant, metaAccessToken: ctxToken } = await getAppContext();

  const tokens = await getAllTenantMetaTokens(tenant.id, ctxToken);
  if (!tokens.length) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const { campaignPreset: presetRepo } = await repositories();
  const presetRow = await presetRepo.findOne({
    where: { tenantId: tenant.id, metaCampaignId }
  });
  const preset = presetRow?.preset ?? "default";
  const rankConfig = await loadRankConfig(tenant.id);
  const spec = rankSpecFor(preset, rankConfig);

  const client = clientSlugParam ? await getClientBySlugOrId(tenant.id, clientSlugParam) : null;
  const clientName = client?.name ?? "—";
  const clientSlug = client ? slugify(client.name) : "";

  const { ads } = await fetchAdsForCampaignAnyToken(tokens, metaCampaignId);
  const insights: Map<string, AdInsightMetrics> = ads.length
    ? await fetchInsightsForCampaignAnyToken(tokens, metaCampaignId)
    : new Map();

  let campaignName = metaCampaignId;
  const byCreative = new Map<string, Agg>();

  for (const ad of ads) {
    if (ad.campaignName) campaignName = ad.campaignName;
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
        anyActive: false
      };
      byCreative.set(key, agg);
    }
    if (!agg.thumbnailUrl && ad.thumbnailUrl) agg.thumbnailUrl = ad.thumbnailUrl;
    if (!agg.imageUrl && ad.imageUrl) agg.imageUrl = ad.imageUrl;
    if (!agg.firstAdId || ad.status === "ACTIVE") agg.firstAdId = ad.id;
    agg.ads.add(ad.id);
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

  const rows = [...byCreative.values()].map((a) => {
    const metrics = metricsOf(a);
    const metricLabel = `${formatMetricValue(spec.metric, metrics[spec.metric] ?? 0, "pt-BR")} · ${METRIC_BY_KEY[spec.metric].label.toUpperCase()}`;
    return {
      id: a.id,
      title: a.name,
      description: a.name,
      type: a.type,
      format: FORMAT_LABELS[a.type] ?? "Imagem",
      clientName,
      clientSlug,
      campaignName,
      status: (a.anyActive ? "active" : "paused") as "active" | "paused",
      performance: "low" as "very_high" | "high" | "medium" | "low",
      metricLabel,
      usageAds: a.ads.size,
      usageCampaigns: 1,
      thumbnailUrl: a.thumbnailUrl ?? null,
      imageUrl: a.imageUrl ?? a.thumbnailUrl ?? null,
      adId: a.firstAdId ?? null,
      dominantPreset: preset,
      metrics
    };
  });

  // Performance por eficiência (mesmo criterio do ranking), com piso minimo.
  const qualified = rows.filter((r) => meetsMinActivity(r.metrics, rankConfig));
  qualified.sort((x, y) => compareByRank(x.metrics, y.metrics, spec));
  const n = qualified.length;
  qualified.forEach((r, i) => {
    const pct = n <= 1 ? 0 : i / (n - 1);
    r.performance =
      pct <= 0.15 ? "very_high" : pct <= 0.4 ? "high" : pct <= 0.75 ? "medium" : "low";
  });
  rows.filter((r) => !meetsMinActivity(r.metrics, rankConfig)).forEach((r) => (r.performance = "low"));

  const perfOrder = { very_high: 0, high: 1, medium: 2, low: 3 } as const;
  rows.sort(
    (x, y) =>
      perfOrder[x.performance] - perfOrder[y.performance] ||
      Number(y.metrics.spend ?? 0) - Number(x.metrics.spend ?? 0)
  );

  return NextResponse.json({ ok: true, rows, total: rows.length, campaignName });
}
