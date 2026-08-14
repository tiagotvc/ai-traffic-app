import "server-only";

import { Between } from "typeorm";

import type { AdAccount } from "@/db/entities/AdAccount";
import { repositories } from "@/db/repositories";
import { isDemoAdAccountId } from "@/lib/demo-data";
import type { AdInsightMetrics, AdUsageRow, CreativeAssetType } from "@/lib/meta-graph";

/**
 * Contas de demonstração (`act_demo_*`) não existem na Meta, então o ranking de
 * criativos — que normalmente vem da Graph API ao vivo — ficaria vazio. Aqui as
 * linhas de `ad_metric_snapshots` semeadas por `scripts/seed-demo-agency-clients.mjs`
 * são convertidas no MESMO formato que `fetchAccountCreatives` devolve, para que
 * a tela `/creatives` e o bloco de criativos do relatório funcionem sem token.
 */

export function isDemoAdAccount(acc: Pick<AdAccount, "metaAdAccountId">): boolean {
  return isDemoAdAccountId(acc.metaAdAccountId);
}

export function hasDemoAdAccount(accounts: Array<Pick<AdAccount, "metaAdAccountId">>): boolean {
  return accounts.some(isDemoAdAccount);
}

/** O workspace tem ao menos uma conta demo? (libera telas que exigem token Meta.) */
export async function tenantHasDemoAdAccounts(tenantId: string): Promise<boolean> {
  const { client: clientRepo, adAccount: adAccountRepo } = await repositories();
  const clients = await clientRepo.find({ where: { tenantId }, select: { id: true } });
  if (!clients.length) return false;
  const accounts = await adAccountRepo.find({
    where: clients.map((c) => ({ clientId: c.id })),
    select: { metaAdAccountId: true }
  });
  return hasDemoAdAccount(accounts);
}

/** Slug estável usado como chave de mídia e nome do arquivo de preview. */
export function demoCreativeSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Preview estático servido de `public/demo-creatives` (fora do middleware de auth). */
export function demoCreativeImageUrl(name: string): string {
  return `/demo-creatives/${demoCreativeSlug(name)}.svg`;
}

const VIDEO_HINTS = /\b(video|v[ií]deo|reels?|stories?|story)\b/i;
const CAROUSEL_HINTS = /\b(carrossel|carousel|din[âa]mico)\b/i;

function inferDemoCreativeType(name: string): CreativeAssetType {
  if (VIDEO_HINTS.test(name)) return "video";
  if (CAROUSEL_HINTS.test(name)) return "carousel";
  return "image";
}

type SnapshotRow = {
  metaCampaignId: string;
  metaAdsetId: string;
  metaAdId: string | null;
  adsetName: string | null;
  adName: string | null;
  day: string | Date;
  spend: string;
  impressions: string;
  clicks: string;
  conversions: string;
  leads: string;
  reach: string;
  messages: string;
  roas: string;
};

type AdBucket = {
  adId: string;
  adsetId: string;
  adsetName: string;
  campaignId: string;
  adName: string;
  lastDay: string;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  conversions: number;
  messages: number;
  roasWeighted: number;
};

/** Anúncio conta como ACTIVE quando ainda teve entrega perto do fim do período. */
const ACTIVE_TAIL_DAYS = 3;

function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** O driver pode devolver colunas `date` como Date; normaliza para YYYY-MM-DD. */
function dayKey(day: string | Date): string {
  return day instanceof Date ? day.toISOString().slice(0, 10) : String(day).slice(0, 10);
}

export type DemoAccountCreatives = {
  ads: AdUsageRow[];
  insights: Map<string, AdInsightMetrics>;
};

/** Monta ads + insights sintéticos de uma conta demo a partir dos snapshots. */
export async function buildDemoAccountCreatives(
  acc: Pick<AdAccount, "id" | "metaAdAccountId">,
  since: string | null | undefined,
  until: string | null | undefined
): Promise<DemoAccountCreatives> {
  const { adMetricSnapshot: adRepo, campaignMetricSnapshot: campRepo } = await repositories();

  const rows = (await adRepo.find({
    where: {
      adAccountId: acc.id,
      ...(since && until ? { day: Between(since.slice(0, 10), until.slice(0, 10)) } : {})
    },
    select: {
      metaCampaignId: true,
      metaAdsetId: true,
      metaAdId: true,
      adsetName: true,
      adName: true,
      day: true,
      spend: true,
      impressions: true,
      clicks: true,
      conversions: true,
      leads: true,
      reach: true,
      messages: true,
      roas: true
    }
  })) as unknown as SnapshotRow[];

  if (!rows.length) return { ads: [], insights: new Map() };

  const campRows = await campRepo.find({
    where: { adAccountId: acc.id },
    select: { metaCampaignId: true, campaignName: true, campaignStatus: true, day: true },
    order: { day: "DESC" }
  });
  const campaignName = new Map<string, string>();
  const campaignStatus = new Map<string, string>();
  for (const c of campRows) {
    if (!campaignName.has(c.metaCampaignId)) {
      campaignName.set(c.metaCampaignId, c.campaignName ?? c.metaCampaignId);
      campaignStatus.set(c.metaCampaignId, c.campaignStatus ?? "ACTIVE");
    }
  }

  const buckets = new Map<string, AdBucket>();
  let maxDay = "";

  for (const r of rows) {
    const adId = r.metaAdId ?? `${r.metaAdsetId}__ad`;
    const day = dayKey(r.day);
    if (day > maxDay) maxDay = day;

    let b = buckets.get(adId);
    if (!b) {
      b = {
        adId,
        adsetId: r.metaAdsetId,
        adsetName: r.adsetName ?? r.metaAdsetId,
        campaignId: r.metaCampaignId,
        adName: r.adName ?? adId,
        lastDay: day,
        spend: 0,
        impressions: 0,
        clicks: 0,
        reach: 0,
        conversions: 0,
        messages: 0,
        roasWeighted: 0
      };
      buckets.set(adId, b);
    }

    const spend = Number(r.spend) || 0;
    b.spend += spend;
    b.impressions += Number(r.impressions) || 0;
    b.clicks += Number(r.clicks) || 0;
    b.reach += Number(r.reach) || 0;
    b.conversions += Number(r.conversions) || Number(r.leads) || 0;
    b.messages += Number(r.messages) || 0;
    b.roasWeighted += (Number(r.roas) || 0) * spend;
    if (day > b.lastDay) b.lastDay = day;
  }

  const activeSince = maxDay ? shiftDay(maxDay, -ACTIVE_TAIL_DAYS) : "";

  const ads: AdUsageRow[] = [];
  const insights = new Map<string, AdInsightMetrics>();

  for (const b of buckets.values()) {
    const slug = demoCreativeSlug(b.adName);
    const campStatus = campaignStatus.get(b.campaignId) ?? "ACTIVE";
    const imageUrl = demoCreativeImageUrl(b.adName);

    ads.push({
      id: b.adId,
      name: b.adName,
      status: b.lastDay >= activeSince ? "ACTIVE" : "PAUSED",
      adsetId: b.adsetId,
      adsetName: b.adsetName,
      campaignId: b.campaignId,
      campaignName: campaignName.get(b.campaignId) ?? b.campaignId,
      campaignStatus: campStatus,
      creativeId: `demo_cr_${slug}`,
      creativeName: b.adName,
      creativeType: inferDemoCreativeType(b.adName),
      thumbnailUrl: imageUrl,
      imageUrl,
      // Dedupe do MESMO criativo entre conjuntos/campanhas, como o image_hash da Meta.
      mediaKey: `i:demo-${slug}`
    });

    insights.set(b.adId, {
      spend: b.spend,
      impressions: b.impressions,
      clicks: b.clicks,
      ctr: b.impressions > 0 ? (b.clicks / b.impressions) * 100 : 0,
      reach: b.reach,
      conversions: b.conversions,
      messages: b.messages,
      roas: b.spend > 0 ? b.roasWeighted / b.spend : 0,
      cpc: b.clicks > 0 ? b.spend / b.clicks : 0,
      cpm: b.impressions > 0 ? (b.spend / b.impressions) * 1000 : 0,
      cpa: b.conversions > 0 ? b.spend / b.conversions : 0,
      cpmsg: b.messages > 0 ? b.spend / b.messages : 0,
      frequency: b.reach > 0 ? b.impressions / b.reach : 0
    });
  }

  return { ads, insights };
}
