import "server-only";

import { In } from "typeorm";

import { repositories } from "@/db/repositories";
import { getWorkspaceGoogleAccessToken } from "@/lib/google-auth-store";
import { getCampaignMetricsDaily } from "@/lib/google-ads-api";

/** Data UTC em 'YYYY-MM-DD' com deslocamento de `daysAgo` dias. */
function isoDay(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export type GoogleSyncResult =
  | { ok: true; customerId: string; days: number; rows: number }
  | { ok: false; error: "not_linked" | "not_connected" | "api_error"; message?: string };

/**
 * Sincroniza (upsert) os snapshots diários de campanha do Google Ads de um cliente.
 * Silo separado — escreve só em google_campaign_metric_snapshots, não toca no Meta.
 */
export async function syncGoogleAdsForClient(
  tenantId: string,
  clientId: string,
  opts?: { days?: number }
): Promise<GoogleSyncResult> {
  const days = Math.min(Math.max(opts?.days ?? 30, 1), 365);
  const { client: clientRepo, googleCampaignMetricSnapshot: snapRepo } = await repositories();

  const client = await clientRepo.findOne({ where: { id: clientId, tenantId } });
  const customerId = client?.googleAdsCustomerId?.replace(/\D/g, "") ?? "";
  if (!customerId) return { ok: false, error: "not_linked" };

  const token = await getWorkspaceGoogleAccessToken(tenantId);
  if (!token) return { ok: false, error: "not_connected" };

  let daily;
  try {
    daily = await getCampaignMetricsDaily(token, customerId, {
      since: isoDay(days),
      until: isoDay(0)
    });
  } catch (err) {
    return { ok: false, error: "api_error", message: err instanceof Error ? err.message : undefined };
  }

  if (daily.length === 0) return { ok: true, customerId, days, rows: 0 };

  const campaignIds = [...new Set(daily.map((r) => r.campaignId))];
  const dayList = [...new Set(daily.map((r) => r.date))];
  const existing = await snapRepo.find({
    where: { clientId, campaignId: In(campaignIds), day: In(dayList) }
  });
  const byKey = new Map(existing.map((e) => [`${e.campaignId}:${e.day}`, e]));

  const toSave = daily.map((r) => {
    const row = byKey.get(`${r.campaignId}:${r.date}`) ?? snapRepo.create({ clientId });
    row.customerId = customerId;
    row.campaignId = r.campaignId;
    row.campaignName = r.name || null;
    row.status = r.status || null;
    row.channelType = r.channelType || null;
    row.day = r.date;
    row.impressions = String(Math.round(r.impressions));
    row.clicks = String(Math.round(r.clicks));
    row.cost = r.cost.toFixed(2);
    row.conversions = r.conversions.toFixed(2);
    row.conversionsValue = r.conversionsValue.toFixed(2);
    row.ctr = r.ctr.toFixed(4);
    row.averageCpc = r.averageCpc.toFixed(4);
    return row;
  });

  await snapRepo.save(toSave, { chunk: 200 });

  return { ok: true, customerId, days, rows: toSave.length };
}
