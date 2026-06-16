import "server-only";

import { Between, In, IsNull } from "typeorm";

import { repositories } from "@/db/repositories";
import type { CampaignMetricSnapshot } from "@/db/entities/CampaignMetricSnapshot";
import type { CampaignMetricsRow } from "@/lib/agency-brain/types";
import { addDaysIso, rollingDaysEndingYesterday, yesterdayIso } from "@/lib/report-period";

function num(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function isDayInRange(day: string, since: string, until: string): boolean {
  return day >= since && day <= until;
}

type SnapshotAgg = {
  campaignName: string;
  spend: number;
  conversions: number;
  impressions: number;
  clicks: number;
  reach: number;
  roasRevenueProxySum: number;
  roasSpend: number;
};

function aggregateSnapshotsByCampaign(
  snapshots: CampaignMetricSnapshot[],
  since: string,
  until: string
): Map<string, SnapshotAgg> {
  const byCampaign = new Map<string, SnapshotAgg>();

  for (const s of snapshots) {
    if (!isDayInRange(s.day, since, until)) continue;
    const cid = s.metaCampaignId;
    if (!cid) continue;
    const cur = byCampaign.get(cid) ?? {
      campaignName: s.campaignName ?? cid,
      spend: 0,
      conversions: 0,
      impressions: 0,
      clicks: 0,
      reach: 0,
      roasRevenueProxySum: 0,
      roasSpend: 0
    };
    const rowSpend = num(s.spend);
    cur.spend += rowSpend;
    cur.conversions += num(s.conversions);
    cur.impressions += num(s.impressions);
    cur.clicks += num(s.clicks);
    cur.reach += num(s.reach);
    const roas = num(s.roas);
    if (roas > 0 && rowSpend > 0) {
      cur.roasRevenueProxySum += roas * rowSpend;
      cur.roasSpend += rowSpend;
    }
    if (s.campaignName) cur.campaignName = s.campaignName;
    byCampaign.set(cid, cur);
  }

  return byCampaign;
}

function rowsFromAgg(byCampaign: Map<string, SnapshotAgg>): CampaignMetricsRow[] {
  const rows: CampaignMetricsRow[] = [];
  for (const [metaCampaignId, agg] of byCampaign) {
    const ctr = agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0;
    const cpa = agg.conversions > 0 ? agg.spend / agg.conversions : null;
    const roas = agg.roasSpend > 0 ? agg.roasRevenueProxySum / agg.roasSpend : 0;
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

function aggToBaseline(agg: SnapshotAgg): BaselineMetrics {
  const cpa = agg.conversions > 0 ? agg.spend / agg.conversions : null;
  const ctr = agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0;
  const roas = agg.roasSpend > 0 ? agg.roasRevenueProxySum / agg.roasSpend : 0;
  const frequency = agg.reach > 0 ? agg.impressions / agg.reach : 0;
  return {
    cpa,
    ctr,
    roas,
    spend: agg.spend,
    conversions: agg.conversions,
    impressions: agg.impressions,
    clicks: agg.clicks,
    reach: agg.reach,
    frequency
  };
}

const BRAIN_METRICS_FETCH_DAYS = 37;

async function fetchClientCampaignSnapshots(
  clientId: string,
  totalDays = BRAIN_METRICS_FETCH_DAYS
): Promise<CampaignMetricSnapshot[]> {
  const { adAccount, campaignMetricSnapshot } = await repositories();
  const accounts = await adAccount.find({ where: { clientId } });
  if (!accounts.length) return [];

  const accountIds = accounts.map((a) => a.id);
  const until = yesterdayIso();
  const since = addDaysIso(until, -(totalDays - 1));

  return campaignMetricSnapshot.find({
    where: {
      adAccountId: In(accountIds),
      day: Between(since, until)
    }
  });
}

export async function getClientMetricsBundle(
  tenantId: string,
  clientId: string,
  windowDays = 7,
  baselineDays = 30
): Promise<{
  current: CampaignMetricsRow[];
  previous: CampaignMetricsRow[];
  baselineByCampaign: Map<string, BaselineMetrics>;
}> {
  void tenantId;
  const fetchDays = Math.max(windowDays * 2, baselineDays) + windowDays - 1;
  const snapshots = await fetchClientCampaignSnapshots(clientId, fetchDays);

  const currentRange = rollingDaysEndingYesterday(windowDays);
  const previousUntil = addDaysIso(currentRange.since, -1);
  const previousSince = addDaysIso(previousUntil, -(windowDays - 1));
  const baselineRange = rollingDaysEndingYesterday(baselineDays);

  const currentAgg = aggregateSnapshotsByCampaign(
    snapshots,
    currentRange.since,
    currentRange.until
  );
  const previousAgg = aggregateSnapshotsByCampaign(snapshots, previousSince, previousUntil);
  const baselineAgg = aggregateSnapshotsByCampaign(
    snapshots,
    baselineRange.since,
    baselineRange.until
  );

  const current = enrichCampaignsWithComparison(
    rowsFromAgg(currentAgg),
    rowsFromAgg(previousAgg)
  );
  const previous = rowsFromAgg(previousAgg);

  const baselineByCampaign = new Map<string, BaselineMetrics>();
  for (const [metaCampaignId, agg] of baselineAgg) {
    baselineByCampaign.set(metaCampaignId, aggToBaseline(agg));
  }

  return { current, previous, baselineByCampaign };
}

export type BaselineMetrics = {
  cpa: number | null;
  ctr: number;
  roas: number;
  spend: number;
  conversions: number;
  impressions: number;
  clicks: number;
  reach: number;
  frequency: number;
};

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
      roasRevenueProxySum: number;
      roasSpend: number;
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
      roasRevenueProxySum: 0,
      roasSpend: 0
    };
    const rowSpend = num(s.spend);
    cur.spend += rowSpend;
    cur.conversions += num(s.conversions);
    cur.impressions += num(s.impressions);
    cur.clicks += num(s.clicks);
    cur.reach += num(s.reach);
    const roas = num(s.roas);
    if (roas > 0 && rowSpend > 0) {
      cur.roasRevenueProxySum += roas * rowSpend;
      cur.roasSpend += rowSpend;
    }
    byCampaign.set(cid, cur);
  }

  const rows: CampaignMetricsRow[] = [];
  for (const [metaCampaignId, agg] of byCampaign) {
    const ctr = agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0;
    const cpa = agg.conversions > 0 ? agg.spend / agg.conversions : null;
    const roas = agg.roasSpend > 0 ? agg.roasRevenueProxySum / agg.roasSpend : 0;
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

  const byCampaign = new Map<
    string,
    {
      spend: number;
      conversions: number;
      impressions: number;
      clicks: number;
      reach: number;
      roasRevenueProxySum: number;
      roasSpend: number;
      campaignName: string;
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
      roasRevenueProxySum: 0,
      roasSpend: 0
    };
    const rowSpend = num(s.spend);
    cur.spend += rowSpend;
    cur.conversions += num(s.conversions);
    cur.impressions += num(s.impressions);
    cur.clicks += num(s.clicks);
    cur.reach += num(s.reach);
    const roas = num(s.roas);
    if (roas > 0 && rowSpend > 0) {
      cur.roasRevenueProxySum += roas * rowSpend;
      cur.roasSpend += rowSpend;
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
      roas: agg.roasSpend > 0 ? agg.roasRevenueProxySum / agg.roasSpend : 0,
      frequency: agg.reach > 0 ? agg.impressions / agg.reach : 0
    });
  }

  return { current: enrichCampaignsWithComparison(current, previous), previous };
}

function pctDelta(actual: number, baseline: number): number {
  if (!Number.isFinite(actual) || !Number.isFinite(baseline)) return 0;
  if (baseline === 0) return 0;
  return ((actual - baseline) / baseline) * 100;
}

/**
 * Enriquecer a janela atual com valores da janela anterior:
 * - previousCpa / previousCtr / previousRoas
 * - cpaDeltaPct / ctrDeltaPct / roasDeltaPct
 */
export function enrichCampaignsWithComparison(
  current: CampaignMetricsRow[],
  previous: CampaignMetricsRow[]
): CampaignMetricsRow[] {
  const prevById = new Map(previous.map((p) => [p.metaCampaignId, p]));

  return current.map((cur) => {
    const prev = prevById.get(cur.metaCampaignId);
    if (!prev) return cur;

    const prevCpa = prev.cpa ?? null;
    const prevCtr = prev.ctr ?? null;
    const prevRoas = prev.roas ?? null;

    const cpaDeltaPct =
      cur.cpa != null && prevCpa != null && prevCpa !== 0 ? pctDelta(cur.cpa, prevCpa) : 0;
    const ctrDeltaPct = prevCtr != null ? pctDelta(cur.ctr, prevCtr) : 0;
    const roasDeltaPct = prevRoas != null ? pctDelta(cur.roas, prevRoas) : 0;

    return {
      ...cur,
      previousCpa: prevCpa,
      previousCtr: prevCtr,
      previousRoas: prevRoas,
      cpaDeltaPct,
      ctrDeltaPct,
      roasDeltaPct
    };
  });
}

export async function getCampaignBaselineMetrics(
  tenantId: string,
  clientId: string,
  metaCampaignId: string,
  windowDays = 30
): Promise<BaselineMetrics & { campaignName: string | null }> {
  const { adAccount, campaignMetricSnapshot } = await repositories();
  const accounts = await adAccount.find({ where: { clientId } });
  if (!accounts.length) {
    return {
      campaignName: null,
      cpa: null,
      ctr: 0,
      roas: 0,
      spend: 0,
      conversions: 0,
      impressions: 0,
      clicks: 0,
      reach: 0,
      frequency: 0
    };
  }

  const accountIds = accounts.map((a) => a.id);
  const { since, until } = rollingDaysEndingYesterday(windowDays);

  const snapshots = await campaignMetricSnapshot.find({
    where: {
      adAccountId: In(accountIds),
      metaCampaignId,
      day: Between(since, until)
    }
  });

  let spend = 0;
  let conversions = 0;
  let impressions = 0;
  let clicks = 0;
  let reach = 0;
  let roasRevenueProxySum = 0;
  let roasSpend = 0;
  let campaignName: string | null = null;

  for (const s of snapshots) {
    spend += num(s.spend);
    conversions += num(s.conversions);
    impressions += num(s.impressions);
    clicks += num(s.clicks);
    reach += num(s.reach);
    campaignName = s.campaignName ?? campaignName;

    const r = num(s.roas);
    const daySpend = num(s.spend);
    if (r > 0 && daySpend > 0) {
      roasRevenueProxySum += r * daySpend;
      roasSpend += daySpend;
    }
  }

  const cpa = conversions > 0 ? spend / conversions : null;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const roas = roasSpend > 0 ? roasRevenueProxySum / roasSpend : 0;
  const frequency = reach > 0 ? impressions / reach : 0;

  return { campaignName, cpa, ctr, roas, spend, conversions, impressions, clicks, reach, frequency };
}

export async function getClientBaselineMetrics(
  tenantId: string,
  clientId: string,
  windowDays = 30
): Promise<BaselineMetrics> {
  const { adAccount, campaignMetricSnapshot } = await repositories();
  const accounts = await adAccount.find({ where: { clientId } });
  if (!accounts.length) {
    return {
      cpa: null,
      ctr: 0,
      roas: 0,
      spend: 0,
      conversions: 0,
      impressions: 0,
      clicks: 0,
      reach: 0,
      frequency: 0
    };
  }

  const accountIds = accounts.map((a) => a.id);
  const { since, until } = rollingDaysEndingYesterday(windowDays);

  const snapshots = await campaignMetricSnapshot.find({
    where: {
      adAccountId: In(accountIds),
      day: Between(since, until)
    }
  });

  let spend = 0;
  let conversions = 0;
  let impressions = 0;
  let clicks = 0;
  let reach = 0;
  let roasRevenueProxySum = 0;
  let roasSpend = 0;

  for (const s of snapshots) {
    spend += num(s.spend);
    conversions += num(s.conversions);
    impressions += num(s.impressions);
    clicks += num(s.clicks);
    reach += num(s.reach);

    const r = num(s.roas);
    const daySpend = num(s.spend);
    if (r > 0 && daySpend > 0) {
      roasRevenueProxySum += r * daySpend;
      roasSpend += daySpend;
    }
  }

  const cpa = conversions > 0 ? spend / conversions : null;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const roas = roasSpend > 0 ? roasRevenueProxySum / roasSpend : 0;
  const frequency = reach > 0 ? impressions / reach : 0;

  return { cpa, ctr, roas, spend, conversions, impressions, clicks, reach, frequency };
}

/**
 * Baselines 30d por campanha (uma query agregada).
 */
export async function getCampaignBaselinesMap(
  tenantId: string,
  clientId: string,
  windowDays = 30
): Promise<Map<string, BaselineMetrics>> {
  const { adAccount, campaignMetricSnapshot } = await repositories();
  const accounts = await adAccount.find({ where: { clientId } });
  if (!accounts.length) return new Map();

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
      spend: number;
      conversions: number;
      impressions: number;
      clicks: number;
      reach: number;
      roasRevenueProxySum: number;
      roasSpend: number;
    }
  >();

  for (const s of snapshots) {
    const cid = s.metaCampaignId;
    if (!cid) continue;
    const cur = byCampaign.get(cid) ?? {
      spend: 0,
      conversions: 0,
      impressions: 0,
      clicks: 0,
      reach: 0,
      roasRevenueProxySum: 0,
      roasSpend: 0
    };
    const rowSpend = num(s.spend);
    cur.spend += rowSpend;
    cur.conversions += num(s.conversions);
    cur.impressions += num(s.impressions);
    cur.clicks += num(s.clicks);
    cur.reach += num(s.reach);
    const roas = num(s.roas);
    if (roas > 0 && rowSpend > 0) {
      cur.roasRevenueProxySum += roas * rowSpend;
      cur.roasSpend += rowSpend;
    }
    byCampaign.set(cid, cur);
  }

  const out = new Map<string, BaselineMetrics>();
  for (const [metaCampaignId, agg] of byCampaign) {
    const cpa = agg.conversions > 0 ? agg.spend / agg.conversions : null;
    const ctr = agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0;
    const roas = agg.roasSpend > 0 ? agg.roasRevenueProxySum / agg.roasSpend : 0;
    const frequency = agg.reach > 0 ? agg.impressions / agg.reach : 0;
    out.set(metaCampaignId, {
      cpa,
      ctr,
      roas,
      spend: agg.spend,
      conversions: agg.conversions,
      impressions: agg.impressions,
      clicks: agg.clicks,
      reach: agg.reach,
      frequency
    });
  }

  return out;
}

// Placeholder: ad_metric_snapshots ainda não existe no código atual (Fase C.2).
// Quando existir, basta agregar por metaAdsetId.
export async function getAdsetBaselineMetrics(
  tenantId: string,
  clientId: string,
  windowDays = 30
): Promise<Map<string, BaselineMetrics>> {
  void tenantId;
  const { adAccount, adMetricSnapshot } = await repositories();
  const accounts = await adAccount.find({ where: { clientId } });
  if (!accounts.length) return new Map();

  const accountIds = accounts.map((a) => a.id);
  const { since, until } = rollingDaysEndingYesterday(windowDays);

  const snapshots = await adMetricSnapshot.find({
    where: {
      adAccountId: In(accountIds),
      day: Between(since, until),
      metaAdId: IsNull()
    }
  });

  const byAdset = new Map<
    string,
    {
      spend: number;
      conversions: number;
      impressions: number;
      clicks: number;
      reach: number;
      messages: number;
      roasRevenueProxySum: number;
      roasSpend: number;
    }
  >();

  for (const s of snapshots) {
    const aid = s.metaAdsetId;
    if (!aid) continue;
    const cur = byAdset.get(aid) ?? {
      spend: 0,
      conversions: 0,
      impressions: 0,
      clicks: 0,
      reach: 0,
      messages: 0,
      roasRevenueProxySum: 0,
      roasSpend: 0
    };
    const rowSpend = num(s.spend);
    cur.spend += rowSpend;
    cur.conversions += num(s.conversions);
    cur.impressions += num(s.impressions);
    cur.clicks += num(s.clicks);
    cur.reach += num(s.reach);
    cur.messages += num(s.messages);
    const roas = num(s.roas);
    if (roas > 0 && rowSpend > 0) {
      cur.roasRevenueProxySum += roas * rowSpend;
      cur.roasSpend += rowSpend;
    }
    byAdset.set(aid, cur);
  }

  const out = new Map<string, BaselineMetrics>();
  for (const [metaAdsetId, agg] of byAdset) {
    const cpa = agg.conversions > 0 ? agg.spend / agg.conversions : null;
    const ctr = agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0;
    const roas = agg.roasSpend > 0 ? agg.roasRevenueProxySum / agg.roasSpend : 0;
    const frequency = agg.reach > 0 ? agg.impressions / agg.reach : 0;
    out.set(metaAdsetId, {
      cpa,
      ctr,
      roas,
      spend: agg.spend,
      conversions: agg.conversions,
      impressions: agg.impressions,
      clicks: agg.clicks,
      reach: agg.reach,
      frequency
    });
  }

  return out;
}

export async function getAdsetMetricsRowsByCampaign(
  clientId: string
): Promise<Map<string, import("@/lib/agency-brain/adset-audience-analyzer").AdsetMetricsRow[]>> {
  const { adAccount, adMetricSnapshot } = await repositories();
  const accounts = await adAccount.find({ where: { clientId } });
  if (!accounts.length) return new Map();

  const accountIds = accounts.map((a) => a.id);
  const until = yesterdayIso();
  const since30 = addDaysIso(until, -29);
  const since7 = addDaysIso(until, -6);

  const snapshots = await adMetricSnapshot.find({
    where: {
      adAccountId: In(accountIds),
      day: Between(since30, until),
      metaAdId: IsNull()
    }
  });

  type Agg = {
    metaAdsetId: string;
    adsetName: string;
    metaCampaignId: string;
    spend30d: number;
    conversions30d: number;
    messages30d: number;
    roasRevenue30d: number;
    roasSpend30d: number;
    spend7d: number;
    conversions7d: number;
    messages7d: number;
    roasRevenue7d: number;
    roasSpend7d: number;
  };

  const byAdset = new Map<string, Agg>();

  for (const s of snapshots) {
    const aid = s.metaAdsetId;
    if (!aid) continue;
    const cur = byAdset.get(aid) ?? {
      metaAdsetId: aid,
      adsetName: s.adsetName ?? aid,
      metaCampaignId: s.metaCampaignId,
      spend30d: 0,
      conversions30d: 0,
      messages30d: 0,
      roasRevenue30d: 0,
      roasSpend30d: 0,
      spend7d: 0,
      conversions7d: 0,
      messages7d: 0,
      roasRevenue7d: 0,
      roasSpend7d: 0
    };
    const rowSpend = num(s.spend);
    const in7 = s.day >= since7;
    cur.spend30d += rowSpend;
    cur.conversions30d += num(s.conversions);
    cur.messages30d += num(s.messages);
    const roas = num(s.roas);
    if (roas > 0 && rowSpend > 0) {
      cur.roasRevenue30d += roas * rowSpend;
      cur.roasSpend30d += rowSpend;
    }
    if (in7) {
      cur.spend7d += rowSpend;
      cur.conversions7d += num(s.conversions);
      cur.messages7d += num(s.messages);
      if (roas > 0 && rowSpend > 0) {
        cur.roasRevenue7d += roas * rowSpend;
        cur.roasSpend7d += rowSpend;
      }
    }
    if (s.adsetName) cur.adsetName = s.adsetName;
    byAdset.set(aid, cur);
  }

  const byCampaign = new Map<string, import("@/lib/agency-brain/adset-audience-analyzer").AdsetMetricsRow[]>();
  for (const agg of byAdset.values()) {
    const row = {
      metaAdsetId: agg.metaAdsetId,
      adsetName: agg.adsetName,
      spend30d: agg.spend30d,
      conversions30d: agg.conversions30d,
      messages30d: agg.messages30d,
      roas30d: agg.roasSpend30d > 0 ? agg.roasRevenue30d / agg.roasSpend30d : 0,
      cpa30d: agg.conversions30d > 0 ? agg.spend30d / agg.conversions30d : null,
      cpmsg30d: agg.messages30d > 0 ? agg.spend30d / agg.messages30d : null,
      spend7d: agg.spend7d,
      conversions7d: agg.conversions7d,
      messages7d: agg.messages7d,
      roas7d: agg.roasSpend7d > 0 ? agg.roasRevenue7d / agg.roasSpend7d : 0,
      cpa7d: agg.conversions7d > 0 ? agg.spend7d / agg.conversions7d : null,
      cpmsg7d: agg.messages7d > 0 ? agg.spend7d / agg.messages7d : null
    };
    const list = byCampaign.get(agg.metaCampaignId) ?? [];
    list.push(row);
    byCampaign.set(agg.metaCampaignId, list);
  }

  return byCampaign;
}
