import "server-only";

import { Between, In } from "typeorm";

import { repositories } from "@/db/repositories";
import type { CampaignMetricsRow } from "@/lib/agency-brain/types";
import { rollingDaysEndingYesterday } from "@/lib/report-period";

function num(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function getClientCampaignMetrics(
  tenantId: string,
  clientId: string,
  windowDays = 7
): Promise<CampaignMetricsRow[]> {
  const { adAccount, campaignMetricSnapshot } = await repositories();
  const accounts = await adAccount.find({ where: { clientId } });
  if (!accounts.length) return [];

  const accountIds = accounts.map((a) => a.id);
  const { since, until } = rollingDaysEndingYesterday(windowDays);

  const snapshots = await campaignMetricSnapshot.find({
    where: {
      adAccountId: In(accountIds),
      day: Between(since, until)
    }
  });

  const byCampaign = new Map<
    string,
    {
      campaignName: string;
      spend: number;
      conversions: number;
      impressions: number;
      clicks: number;
      reach: number;
      roasSum: number;
      roasCount: number;
    }
  >();

  for (const s of snapshots) {
    const cid = s.metaCampaignId;
    if (!cid) continue;
    const cur = byCampaign.get(cid) ?? {
      campaignName: s.campaignName ?? cid,
      spend: 0,
      conversions: 0,
      impressions: 0,
      clicks: 0,
      reach: 0,
      roasSum: 0,
      roasCount: 0
    };
    cur.spend += num(s.spend);
    cur.conversions += num(s.conversions);
    cur.impressions += num(s.impressions);
    cur.clicks += num(s.clicks);
    cur.reach += num(s.reach);
    const roas = num(s.roas);
    if (roas > 0) {
      cur.roasSum += roas;
      cur.roasCount += 1;
    }
    byCampaign.set(cid, cur);
  }

  const rows: CampaignMetricsRow[] = [];
  for (const [metaCampaignId, agg] of byCampaign) {
    const ctr = agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0;
    const cpa = agg.conversions > 0 ? agg.spend / agg.conversions : null;
    const roas = agg.roasCount > 0 ? agg.roasSum / agg.roasCount : 0;
    const frequency = agg.reach > 0 ? agg.impressions / agg.reach : 0;

    rows.push({
      metaCampaignId,
      campaignName: agg.campaignName,
      spend: agg.spend,
      conversions: agg.conversions,
      impressions: agg.impressions,
      clicks: agg.clicks,
      reach: agg.reach,
      ctr,
      cpa,
      roas,
      frequency
    });
  }

  return rows;
}

export async function getClientCampaignMetricsWithComparison(
  tenantId: string,
  clientId: string,
  windowDays = 7
): Promise<{ current: CampaignMetricsRow[]; previous: CampaignMetricsRow[] }> {
  const current = await getClientCampaignMetrics(tenantId, clientId, windowDays);

  const { adAccount, campaignMetricSnapshot } = await repositories();
  const accounts = await adAccount.find({ where: { clientId } });
  if (!accounts.length) return { current, previous: [] };

  const accountIds = accounts.map((a) => a.id);
  const end = rollingDaysEndingYesterday(windowDays);
  const prevEnd = rollingDaysEndingYesterday(windowDays * 2);
  const prevSince = prevEnd.since;
  const prevUntil = end.since;

  const snapshots = await campaignMetricSnapshot.find({
    where: {
      adAccountId: In(accountIds),
      day: Between(prevSince, prevUntil)
    }
  });

  const byCampaign = new Map<string, { spend: number; conversions: number; impressions: number; clicks: number; reach: number; roasSum: number; roasCount: number; campaignName: string }>();

  for (const s of snapshots) {
    const cid = s.metaCampaignId;
    if (!cid) continue;
    const cur = byCampaign.get(cid) ?? {
      campaignName: s.campaignName ?? cid,
      spend: 0,
      conversions: 0,
      impressions: 0,
      clicks: 0,
      reach: 0,
      roasSum: 0,
      roasCount: 0
    };
    cur.spend += num(s.spend);
    cur.conversions += num(s.conversions);
    cur.impressions += num(s.impressions);
    cur.clicks += num(s.clicks);
    cur.reach += num(s.reach);
    const roas = num(s.roas);
    if (roas > 0) {
      cur.roasSum += roas;
      cur.roasCount += 1;
    }
    byCampaign.set(cid, cur);
  }

  const previous: CampaignMetricsRow[] = [];
  for (const [metaCampaignId, agg] of byCampaign) {
    const ctr = agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0;
    previous.push({
      metaCampaignId,
      campaignName: agg.campaignName,
      spend: agg.spend,
      conversions: agg.conversions,
      impressions: agg.impressions,
      clicks: agg.clicks,
      reach: agg.reach,
      ctr,
      cpa: agg.conversions > 0 ? agg.spend / agg.conversions : null,
      roas: agg.roasCount > 0 ? agg.roasSum / agg.roasCount : 0,
      frequency: agg.reach > 0 ? agg.impressions / agg.reach : 0
    });
  }

  return { current, previous };
}
