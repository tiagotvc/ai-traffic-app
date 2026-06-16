import "server-only";

import { Between, In } from "typeorm";

import { repositories } from "@/db/repositories";
import { addDaysIso, rollingDaysEndingYesterday, yesterdayIso } from "@/lib/report-period";

export type CampaignDayPoint = {
  day: string;
  spend: number;
  conversions: number;
  impressions: number;
  clicks: number;
  roas: number;
  cpa: number | null;
};

export type ForecastProjection = {
  horizonDays: number;
  spend: { projected: number; low: number; high: number };
  conversions: { projected: number; low: number; high: number };
  cpa: { projected: number | null; low: number | null; high: number | null };
  roas: { projected: number; low: number; high: number };
  method: "moving_avg_7d_linear";
};

export type ForecastResult = {
  metaCampaignId: string;
  campaignName: string | null;
  series: CampaignDayPoint[];
  projection: ForecastProjection | null;
  quality: "ok" | "insufficient_history";
  daysWithSpend: number;
};

function num(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function linearSlope(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i]!;
    sumXY += i * values[i]!;
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export async function getCampaignTimeSeries(
  tenantId: string,
  clientId: string,
  metaCampaignId: string,
  days = 30
): Promise<CampaignDayPoint[]> {
  void tenantId;
  const { adAccount, campaignMetricSnapshot } = await repositories();
  const accounts = await adAccount.find({ where: { clientId } });
  if (!accounts.length) return [];

  const until = yesterdayIso();
  const since = addDaysIso(until, -(days - 1));

  const snapshots = await campaignMetricSnapshot.find({
    where: {
      adAccountId: In(accounts.map((a) => a.id)),
      metaCampaignId,
      day: Between(since, until)
    },
    order: { day: "ASC" }
  });

  return snapshots.map((s) => {
    const spend = num(s.spend);
    const conversions = num(s.conversions);
    return {
      day: s.day,
      spend,
      conversions,
      impressions: num(s.impressions),
      clicks: num(s.clicks),
      roas: num(s.roas),
      cpa: conversions > 0 ? spend / conversions : null
    };
  });
}

export function projectMetrics(series: CampaignDayPoint[], horizonDays: number): ForecastProjection | null {
  const spendDays = series.filter((d) => d.spend > 0);
  if (spendDays.length < 7) return null;

  const recent = spendDays.slice(-7);
  const spendValues = recent.map((d) => d.spend);
  const avgSpend = spendValues.reduce((a, b) => a + b, 0) / spendValues.length;
  const slope = linearSlope(spendValues);
  const spendStd = stdDev(spendValues);

  const projectedDailySpend = Math.max(0, avgSpend + slope * (horizonDays / 2));
  const projectedSpend = projectedDailySpend * horizonDays;

  const convDays = series.filter((d) => d.conversions > 0);
  const convSpend = convDays.reduce((s, d) => s + d.spend, 0);
  const convTotal = convDays.reduce((s, d) => s + d.conversions, 0);
  const cpaWeighted = convTotal > 0 ? convSpend / convTotal : null;

  const roasDays = series.filter((d) => d.roas > 0 && d.spend > 0);
  const roasSpend = roasDays.reduce((s, d) => s + d.spend, 0);
  const roasRevenue = roasDays.reduce((s, d) => s + d.roas * d.spend, 0);
  const roasWeighted = roasSpend > 0 ? roasRevenue / roasSpend : 0;

  const projectedConversions =
    cpaWeighted != null && cpaWeighted > 0 ? projectedSpend / cpaWeighted : 0;

  const spendBand = spendStd * Math.sqrt(horizonDays);

  return {
    horizonDays,
    spend: {
      projected: projectedSpend,
      low: Math.max(0, projectedSpend - spendBand),
      high: projectedSpend + spendBand
    },
    conversions: {
      projected: projectedConversions,
      low: Math.max(0, projectedConversions * 0.85),
      high: projectedConversions * 1.15
    },
    cpa: {
      projected: cpaWeighted,
      low: cpaWeighted != null ? cpaWeighted * 0.9 : null,
      high: cpaWeighted != null ? cpaWeighted * 1.1 : null
    },
    roas: {
      projected: roasWeighted,
      low: roasWeighted * 0.9,
      high: roasWeighted * 1.1
    },
    method: "moving_avg_7d_linear"
  };
}

export async function getCampaignForecast(input: {
  tenantId: string;
  clientId: string;
  metaCampaignId: string;
  horizonDays?: number;
  historyDays?: number;
}): Promise<ForecastResult> {
  const horizonDays = input.horizonDays ?? 7;
  const historyDays = input.historyDays ?? 30;
  const series = await getCampaignTimeSeries(
    input.tenantId,
    input.clientId,
    input.metaCampaignId,
    historyDays
  );

  const daysWithSpend = series.filter((d) => d.spend > 0).length;
  const { campaignMetricSnapshot } = await repositories();
  const nameRow = await campaignMetricSnapshot.findOne({
    where: { metaCampaignId: input.metaCampaignId },
    order: { day: "DESC" }
  });

  if (daysWithSpend < 7) {
    return {
      metaCampaignId: input.metaCampaignId,
      campaignName: nameRow?.campaignName ?? null,
      series,
      projection: null,
      quality: "insufficient_history",
      daysWithSpend
    };
  }

  return {
    metaCampaignId: input.metaCampaignId,
    campaignName: nameRow?.campaignName ?? null,
    series,
    projection: projectMetrics(series, horizonDays),
    quality: "ok",
    daysWithSpend
  };
}

export async function listClientCampaignsForForecast(tenantId: string, clientId: string) {
  void tenantId;
  const { adAccount, campaignMetricSnapshot } = await repositories();
  const accounts = await adAccount.find({ where: { clientId } });
  if (!accounts.length) return [];

  const range = rollingDaysEndingYesterday(30);
  const rows = await campaignMetricSnapshot
    .createQueryBuilder("s")
    .select("s.metaCampaignId", "metaCampaignId")
    .addSelect("MAX(s.campaignName)", "campaignName")
    .addSelect("SUM(s.spend::numeric)", "spend")
    .where("s.adAccountId IN (:...ids)", { ids: accounts.map((a) => a.id) })
    .andWhere("s.day >= :since", { since: range.since })
    .andWhere("s.day <= :until", { until: range.until })
    .groupBy("s.metaCampaignId")
    .having("SUM(s.spend::numeric) > 0")
    .orderBy("spend", "DESC")
    .limit(40)
    .getRawMany<{ metaCampaignId: string; campaignName: string | null }>();

  return rows.map((r) => ({
    metaCampaignId: r.metaCampaignId,
    campaignName: r.campaignName
  }));
}
