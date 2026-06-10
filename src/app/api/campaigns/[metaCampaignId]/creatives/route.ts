import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext, slugify } from "@/lib/app-context";
import { resolveMetaTokensForApi } from "@/lib/campaign-detail-api";
import {
  type CreativeAssetType,
  fetchAdsForCampaign,
  fetchCampaign,
  resolveCreativeFromAd
} from "@/lib/meta-graph";

const FORMAT_LABELS: Record<CreativeAssetType, string> = {
  image: "Imagem",
  video: "Vídeo",
  carousel: "Carrossel",
  copy: "Copy",
  headline: "Headline",
  description: "Descrição"
};

type CreativeRow = {
  id: string;
  title: string;
  description: string;
  type: CreativeAssetType;
  format: string;
  clientName: string;
  clientSlug: string;
  campaignName: string;
  status: "active" | "testing" | "paused" | "archived";
  performance: "high" | "very_high" | "medium" | "low";
  metricLabel: string;
  usageAds: number;
  usageCampaigns: number;
  createdAt: string;
  thumbnailUrl?: string | null;
};

async function loadAds(
  metaCampaignId: string,
  primaryToken?: string,
  fallbackToken?: string
) {
  for (const token of [primaryToken, fallbackToken]) {
    if (!token) continue;
    try {
      return await fetchAdsForCampaign(token, metaCampaignId);
    } catch {
      /* try fallback token */
    }
  }
  return [];
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ metaCampaignId: string }> }
) {
  const { metaCampaignId } = await params;
  const { tenant, user, metaAccessToken: ctxToken } = await getAppContext();
  const { metaAccessToken, fallbackMetaToken } = await resolveMetaTokensForApi(
    tenant.id,
    user.id,
    ctxToken
  );

  if (!metaAccessToken && !fallbackMetaToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const token = metaAccessToken ?? fallbackMetaToken!;
  const { creativeAsset: repo, client: clientRepo } = await repositories();
  const clients = await clientRepo.find({ where: { tenantId: tenant.id } });
  const clientMap = new Map(clients.map((c) => [c.id, c]));
  const assets = await repo.find({ order: { createdAt: "DESC" }, take: 500 });
  const assetByHash = new Map(
    assets.filter((a) => a.metaImageHash).map((a) => [a.metaImageHash!, a])
  );

  const [campaign, ads] = await Promise.all([
    fetchCampaign(token, metaCampaignId).catch(() => null),
    loadAds(metaCampaignId, metaAccessToken ?? undefined, fallbackMetaToken)
  ]);

  const campaignName = campaign?.name ?? metaCampaignId;
  const creativeUsage = new Map<
    string,
    {
      creativeId: string;
      name?: string;
      thumbnailUrl?: string;
      imageHash?: string;
      type: CreativeAssetType;
      adCount: number;
      status: string;
    }
  >();

  for (const ad of ads) {
    const resolved = resolveCreativeFromAd(ad);
    if (!resolved) continue;

    const existing = creativeUsage.get(resolved.id);
    if (existing) {
      existing.adCount += 1;
      if (ad.status === "ACTIVE") existing.status = "ACTIVE";
      if (!existing.thumbnailUrl && resolved.thumbnailUrl) {
        existing.thumbnailUrl = resolved.thumbnailUrl;
      }
      if (!existing.name && resolved.name) existing.name = resolved.name;
    } else {
      creativeUsage.set(resolved.id, {
        creativeId: resolved.id,
        name: resolved.name,
        thumbnailUrl: resolved.thumbnailUrl,
        imageHash: resolved.imageHash,
        type: resolved.type,
        adCount: 1,
        status: ad.status ?? "PAUSED"
      });
    }
  }

  const rows: CreativeRow[] = [];
  for (const entry of creativeUsage.values()) {
    const local = entry.imageHash ? assetByHash.get(entry.imageHash) : undefined;
    const client = local ? clientMap.get(local.clientId) : clients[0];
    rows.push({
      id: local?.id ?? entry.creativeId,
      title: local?.label ?? entry.name ?? entry.creativeId,
      description: local?.label ?? entry.name ?? "Criativo Meta",
      type: entry.type,
      format: FORMAT_LABELS[entry.type],
      clientName: client?.name ?? "—",
      clientSlug: client ? slugify(client.name) : "",
      campaignName,
      status: entry.status === "ACTIVE" ? "active" : "paused",
      performance: "medium",
      metricLabel: "—",
      usageAds: entry.adCount,
      usageCampaigns: 1,
      createdAt: local?.createdAt.toISOString() ?? new Date().toISOString(),
      thumbnailUrl: entry.thumbnailUrl ?? null
    });
  }

  return NextResponse.json({ ok: true, rows, total: rows.length, campaignName });
}
