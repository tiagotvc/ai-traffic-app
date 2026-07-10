import "server-only";

import { In } from "typeorm";

import { repositories } from "@/db/repositories";
import type { Client } from "@/db/entities/Client";
import { slugify } from "@/lib/app-context";
import { redisDeleteByPrefix } from "@/lib/redis-cache";
import type { ParsedPeriod } from "@/lib/report-period";

/** Prefixo das chaves de cache (Redis) da listagem de clientes (`/api/clients`), por tenant. */
export function clientsListCacheKeyPrefix(tenantId: string): string {
  return `clients:list:${tenantId}:`;
}

/** Prefixo das chaves de cache (Redis) dos cards de clientes (`/api/clients/cards`), por tenant. */
export function clientsCardsCacheKeyPrefix(tenantId: string): string {
  return `clients:cards:${tenantId}:`;
}

/**
 * Invalida o cache da listagem de clientes do tenant (lista + cards). Chamar após
 * criar/excluir clientes para a lista não voltar "do cache" com itens já removidos.
 */
export async function invalidateClientsListCache(tenantId: string): Promise<void> {
  await Promise.all([
    redisDeleteByPrefix(clientsListCacheKeyPrefix(tenantId)),
    redisDeleteByPrefix(clientsCardsCacheKeyPrefix(tenantId))
  ]);
}

export type ClientListCard = {
  id: string;
  slug: string;
  name: string;
  roas: number;
  metrics: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    reach: number;
    messages: number;
    ctr: number;
    cpc: number;
    cpm: number;
    cpa: number;
    cpmsg: number;
    frequency: number;
    roas: number;
  };
  dominantPreset: string;
  accounts: number;
  alertCount: number;
  metaConnected: boolean;
  googleConnected: boolean;
  pixelCount: number;
  hasPage: boolean;
};

export async function buildClientListCards(
  tenantId: string,
  clients: Client[],
  period: ParsedPeriod
): Promise<ClientListCard[]> {
  const {
    adAccount: adAccountRepo,
    metricSnapshot: metricsRepo,
    campaignMetricSnapshot: campRepo,
    campaignPreset: presetRepo,
    alert: alertRepo,
    clientMetaSettings: metaSettingsRepo,
    googleCampaignMetricSnapshot: googleCampRepo
  } = await repositories();

  const clientIds = clients.map((c) => c.id);
  const [accounts, metaSettingsRows] = await Promise.all([
    clientIds.length ? adAccountRepo.find({ where: { clientId: In(clientIds) } }) : Promise.resolve([]),
    clientIds.length
      ? metaSettingsRepo.find({ where: { clientId: In(clientIds) } })
      : Promise.resolve([])
  ]);
  const metaSettingsByClient = new Map(metaSettingsRows.map((s) => [s.clientId, s]));

  const accountIds = accounts.map((a) => a.id);
  const accountToClient = new Map(accounts.map((a) => [a.id, a.clientId]));

  const [metricsAggRows, alertCountsRaw, presetRows, campaignIdsByClient, googleAggRows] =
    await Promise.all([
    accountIds.length && !period.allTime && period.since && period.until
      ? metricsRepo
          .createQueryBuilder("m")
          .select("m.adAccountId", "adAccountId")
          .addSelect("COALESCE(SUM(m.spend::numeric), 0)", "spend")
          .addSelect("COALESCE(SUM(m.impressions::bigint), 0)", "impressions")
          .addSelect("COALESCE(SUM(m.clicks::bigint), 0)", "clicks")
          .addSelect("COALESCE(SUM(m.conversions::bigint), 0)", "conversions")
          .addSelect("COALESCE(SUM(m.reach::bigint), 0)", "reach")
          .addSelect("COALESCE(SUM(m.messages::bigint), 0)", "messages")
          .addSelect("AVG(NULLIF(m.roas::numeric, 0))", "roasAvg")
          .where("m.adAccountId IN (:...accountIds)", { accountIds })
          .andWhere("m.day >= :since", { since: period.since })
          .andWhere("m.day <= :until", { until: period.until })
          .groupBy("m.adAccountId")
          .getRawMany<{
            adAccountId: string;
            spend: string;
            impressions: string;
            clicks: string;
            conversions: string;
            reach: string;
            messages: string;
            roasAvg: string | null;
          }>()
      : Promise.resolve([]),
    clientIds.length
      ? alertRepo
          .createQueryBuilder("a")
          .select("a.clientId", "clientId")
          .addSelect("COUNT(*)::int", "cnt")
          .where("a.tenantId = :tenantId", { tenantId })
          .andWhere("a.dismissed = false")
          .andWhere("a.clientId IN (:...clientIds)", { clientIds })
          .groupBy("a.clientId")
          .getRawMany<{ clientId: string; cnt: string }>()
      : Promise.resolve([]),
    presetRepo.find({ where: { tenantId } }),
    accountIds.length && !period.allTime && period.since && period.until
      ? campRepo
          .createQueryBuilder("s")
          .select("s.adAccountId", "adAccountId")
          .addSelect("s.metaCampaignId", "metaCampaignId")
          .where("s.adAccountId IN (:...accountIds)", { accountIds })
          .andWhere("s.day >= :since", { since: period.since })
          .andWhere("s.day <= :until", { until: period.until })
          .groupBy("s.adAccountId")
          .addGroupBy("s.metaCampaignId")
          .getRawMany<{ adAccountId: string; metaCampaignId: string }>()
      : Promise.resolve([]),
    clientIds.length && !period.allTime && period.since && period.until
      ? googleCampRepo
          .createQueryBuilder("g")
          .select("g.clientId", "clientId")
          .addSelect("COALESCE(SUM(g.cost::numeric), 0)", "cost")
          .addSelect("COALESCE(SUM(g.impressions::bigint), 0)", "impressions")
          .addSelect("COALESCE(SUM(g.clicks::bigint), 0)", "clicks")
          .addSelect("COALESCE(SUM(g.conversions::numeric), 0)", "conversions")
          .addSelect(`COALESCE(SUM(g."conversionsValue"::numeric), 0)`, "conversionsValue")
          .where("g.clientId IN (:...clientIds)", { clientIds })
          .andWhere("g.day >= :since", { since: period.since })
          .andWhere("g.day <= :until", { until: period.until })
          .groupBy("g.clientId")
          .getRawMany<{
            clientId: string;
            cost: string;
            impressions: string;
            clicks: string;
            conversions: string;
            conversionsValue: string;
          }>()
          // Silo Google não pode derrubar a lista (ex.: tabela ainda não migrada).
          .catch(() => [])
      : Promise.resolve([])
  ]);

  const metricsByAccount = new Map(
    metricsAggRows.map((r) => [
      r.adAccountId,
      {
        spend: Number(r.spend) || 0,
        impressions: Number(r.impressions) || 0,
        clicks: Number(r.clicks) || 0,
        conversions: Number(r.conversions) || 0,
        reach: Number(r.reach) || 0,
        messages: Number(r.messages) || 0,
        roas: Number(r.roasAvg) || 0
      }
    ])
  );

  const alertCountByClient = new Map(alertCountsRaw.map((r) => [r.clientId, Number(r.cnt) || 0]));
  const googleByClient = new Map(
    googleAggRows.map((r) => [
      r.clientId,
      {
        spend: Number(r.cost) || 0,
        impressions: Number(r.impressions) || 0,
        clicks: Number(r.clicks) || 0,
        conversions: Number(r.conversions) || 0,
        conversionsValue: Number(r.conversionsValue) || 0
      }
    ])
  );
  const presetByCampaign = new Map(presetRows.map((r) => [r.metaCampaignId, r.preset]));

  const clientCampaigns = new Map<string, Set<string>>();
  for (const r of campaignIdsByClient) {
    const cid = accountToClient.get(r.adAccountId);
    if (!cid || !r.metaCampaignId) continue;
    let set = clientCampaigns.get(cid);
    if (!set) {
      set = new Set();
      clientCampaigns.set(cid, set);
    }
    set.add(r.metaCampaignId);
  }

  function dominantPreset(clientId: string): string {
    const ids = clientCampaigns.get(clientId);
    if (!ids || ids.size === 0) return "default";
    const counts = new Map<string, number>();
    for (const id of ids) {
      const p = presetByCampaign.get(id) ?? "default";
      counts.set(p, (counts.get(p) ?? 0) + 1);
    }
    let best = "default";
    let bestN = -1;
    for (const [p, n] of counts) {
      if (n > bestN) {
        best = p;
        bestN = n;
      }
    }
    return best;
  }

  return clients.map((c) => {
    const clientAccounts = accounts.filter((a) => a.clientId === c.id);

    let spend = 0;
    let impressions = 0;
    let clicks = 0;
    let conversions = 0;
    let reach = 0;
    let messages = 0;
    let roasSum = 0;
    let roasCount = 0;
    for (const acc of clientAccounts) {
      const m = metricsByAccount.get(acc.id);
      if (!m) continue;
      spend += m.spend;
      impressions += m.impressions;
      clicks += m.clicks;
      conversions += m.conversions;
      reach += m.reach;
      messages += m.messages;
      if (m.roas > 0) {
        roasSum += m.roas;
        roasCount += 1;
      }
    }

    // Soma as métricas Google Ads do cliente (silo separado, agregado por clientId).
    const g = googleByClient.get(c.id);
    if (g) {
      spend += g.spend;
      impressions += g.impressions;
      clicks += g.clicks;
      conversions += g.conversions;
      const gRoas = g.spend > 0 && g.conversionsValue > 0 ? g.conversionsValue / g.spend : 0;
      if (gRoas > 0) {
        roasSum += gRoas;
        roasCount += 1;
      }
    }

    const roas = roasCount ? roasSum / roasCount : 0;
    const metricsAgg = {
      spend,
      impressions,
      clicks,
      conversions,
      reach,
      messages,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
      cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
      cpa: conversions > 0 ? spend / conversions : 0,
      cpmsg: messages > 0 ? spend / messages : 0,
      frequency: reach > 0 ? impressions / reach : 0,
      roas
    };

    const metaSettings = metaSettingsByClient.get(c.id);
    const linkedPixels = metaSettings?.linkedMetaPixelIds?.filter(Boolean) ?? [];
    const pixelCount =
      linkedPixels.length > 0 ? linkedPixels.length : metaSettings?.metaPixelId ? 1 : 0;

    return {
      id: c.id,
      slug: slugify(c.name),
      name: c.name,
      roas,
      metrics: metricsAgg,
      dominantPreset: dominantPreset(c.id),
      accounts: clientAccounts.length,
      alertCount: alertCountByClient.get(c.id) ?? 0,
      metaConnected: !!c.metaBusinessId || clientAccounts.length > 0,
      googleConnected: !!c.googleAdsCustomerId,
      pixelCount,
      hasPage: !!c.metaPageId
    };
  });
}
