import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId, slugify } from "@/lib/app-context";
import { resolveMetaTokensForApi } from "@/lib/campaign-detail-api";
import {
  fetchAdInsightsForAccount,
  fetchAdsWithUsageForAccount,
  type AdInsightMetrics
} from "@/lib/meta-graph";

// Busca anúncios + insights de todas as contas do cliente — dá folga.
export const maxDuration = 60;

type Agg = {
  name: string;
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
  campaigns: Map<string, string>;
  adsets: Map<string, string>;
  campaignIds: string[];
  anyActive: boolean;
};

export async function GET(req: Request) {
  const clientIdParam = new URL(req.url).searchParams.get("clientId");
  const { tenant, user, metaAccessToken: ctxToken } = await getAppContext();

  if (!clientIdParam) return NextResponse.json({ ok: true, rows: [] });
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
      const key = ad.creativeName?.trim() || ad.name?.trim() || ad.creativeId || ad.id;
      let agg = byCreative.get(key);
      if (!agg) {
        agg = {
          name: ad.creativeName?.trim() || ad.name?.trim() || key,
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
          campaigns: new Map(),
          adsets: new Map(),
          campaignIds: [],
          anyActive: false
        };
        byCreative.set(key, agg);
      }
      if (!agg.thumbnailUrl && ad.thumbnailUrl) agg.thumbnailUrl = ad.thumbnailUrl;
      if (!agg.imageUrl && ad.imageUrl) agg.imageUrl = ad.imageUrl;
      agg.ads.add(ad.id);
      if (ad.campaignId) {
        agg.campaigns.set(ad.campaignId, ad.campaignName ?? ad.campaignId);
        agg.campaignIds.push(ad.campaignId);
      }
      if (ad.adsetId) agg.adsets.set(ad.adsetId, ad.adsetName ?? ad.adsetId);
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

  const rows = [...byCreative.values()].map((a) => {
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

    return {
      creativeName: a.name,
      thumbnailUrl: a.thumbnailUrl ?? null,
      imageUrl: a.imageUrl ?? a.thumbnailUrl ?? null,
      dominantPreset,
      status: a.anyActive ? "ACTIVE" : "PAUSED",
      adsCount: a.ads.size,
      campaigns: [...a.campaigns.entries()].map(([id, name]) => ({ id, name })),
      adsets: [...a.adsets.entries()].map(([id, name]) => ({ id, name })),
      clientSlug: slugify(client.name),
      metrics: {
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
      }
    };
  });

  return NextResponse.json({ ok: true, rows, clientName: client.name });
}
