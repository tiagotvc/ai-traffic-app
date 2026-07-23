import "server-only";

import { Between, In } from "typeorm";

import { repositories } from "@/db/repositories";
import { getClientBySlugOrId, listClientsForTenant } from "@/lib/app-context";
import { matchesClientBusinessScope } from "@/lib/client-meta-business";
import { normalizeDayKey } from "@/lib/report-period";
import { addDaysIso, parsePeriodFromSearchParams, todayIso } from "@/lib/report-period";

export type MetricTotals = {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  reach: number;
  messages: number;
  roas: number;
};

export type MetricDayRow = MetricTotals & { day: string };

export async function resolveDashboardScope(
  tenantId: string,
  clientIdParam?: string | null,
  adAccountIdParam?: string | null
) {
  const { adAccount: adAccountRepo } = await repositories();

  let clientIds: string[] | null = null;
  let clientBm: string | null = null;
  if (clientIdParam) {
    const client = await getClientBySlugOrId(tenantId, clientIdParam);
    if (client) {
      clientIds = [client.id];
      clientBm = client.metaBusinessId?.trim() || null;
    }
  } else {
    const clients = await listClientsForTenant(tenantId);
    clientIds = clients.map((c) => c.id);
  }

  if (!clientIds?.length) {
    return { accountIds: [] as string[], adAccounts: [], clientIds: [] as string[] };
  }

  let accounts = await adAccountRepo.find({ where: { clientId: In(clientIds) } });

  if (clientBm) {
    accounts = accounts.filter((a) => matchesClientBusinessScope(a.metaBusinessId, clientBm));
  }

  if (adAccountIdParam) {
    accounts = accounts.filter(
      (a) => a.id === adAccountIdParam || a.metaAdAccountId === adAccountIdParam
    );
  }

  return {
    accountIds: accounts.map((a) => a.id),
    adAccounts: accounts,
    clientIds
  };
}

/** Mapa metaAdAccountId → IANA timezone, lido do inventário Meta (sincronizado). */
export async function inventoryTimezoneMap(tenantId: string) {
  const { metaAdAccountInventory } = await repositories();
  const rows = await metaAdAccountInventory.find({ where: { tenantId } });
  return new Map<string, string | null>(rows.map((r) => [r.metaAdAccountId, r.timezone ?? null]));
}

export function parseDashboardSearchParams(url: URL) {
  const clientId = url.searchParams.get("clientId");
  const adAccountId = url.searchParams.get("adAccountId");
  const period = parsePeriodFromSearchParams(url);
  return {
    clientId: clientId || null,
    adAccountId: adAccountId || null,
    days: period.days ?? 7,
    period
  };
}

export function dateNDaysAgo(n: number) {
  return addDaysIso(todayIso(), -n);
}

function emptyTotals(): MetricTotals {
  return { spend: 0, impressions: 0, clicks: 0, conversions: 0, reach: 0, messages: 0, roas: 0 };
}

function parseTotalsRow(r: {
  spend?: string;
  impressions?: string;
  clicks?: string;
  conversions?: string;
  reach?: string;
  messages?: string;
  roasAvg?: string | null;
}): MetricTotals {
  return {
    spend: Number(r.spend) || 0,
    impressions: Number(r.impressions) || 0,
    clicks: Number(r.clicks) || 0,
    conversions: Number(r.conversions) || 0,
    reach: Number(r.reach) || 0,
    messages: Number(r.messages) || 0,
    roas: Number(r.roasAvg) || 0
  };
}

function resolveDateRange(
  days: number,
  opts?: { since?: string | null; until?: string | null; allTime?: boolean }
) {
  if (opts?.allTime) return null;
  const end = opts?.until?.slice(0, 10) ?? todayIso();
  const start = opts?.since?.slice(0, 10) ?? dateNDaysAgo(days);
  return { start, end };
}

async function useAccountMetricSnapshots(
  accountIds: string[],
  start: string,
  end: string
): Promise<boolean> {
  const { metricSnapshot: metricsRepo } = await repositories();
  const row = await metricsRepo
    .createQueryBuilder("m")
    .select("1")
    .where("m.adAccountId IN (:...accountIds)", { accountIds })
    .andWhere("m.day >= :start", { start })
    .andWhere("m.day <= :end", { end })
    .limit(1)
    .getRawOne();
  return !!row;
}

/** Totais agregados no SQL (1 linha) — muito mais rápido que carregar snapshots. */
export async function loadMetricTotals(
  accountIds: string[],
  days = 30,
  opts?: { since?: string | null; until?: string | null; allTime?: boolean }
): Promise<MetricTotals> {
  if (!accountIds.length) return emptyTotals();

  const range = resolveDateRange(days, opts);
  const { metricSnapshot: metricsRepo, campaignMetricSnapshot: campRepo } = await repositories();

  const buildQb = (useAccount: boolean) => {
    const qb = (useAccount ? metricsRepo : campRepo).createQueryBuilder("m");
    qb.select("COALESCE(SUM(m.spend::numeric), 0)", "spend")
      .addSelect("COALESCE(SUM(m.impressions::bigint), 0)", "impressions")
      .addSelect("COALESCE(SUM(m.clicks::bigint), 0)", "clicks")
      .addSelect("COALESCE(SUM(m.conversions::bigint), 0)", "conversions")
      .addSelect("COALESCE(SUM(m.reach::bigint), 0)", "reach")
      .addSelect("COALESCE(SUM(m.messages::bigint), 0)", "messages")
      .addSelect("AVG(NULLIF(m.roas::numeric, 0))", "roasAvg")
      .where("m.adAccountId IN (:...accountIds)", { accountIds });
    if (range) {
      qb.andWhere("m.day >= :start", { start: range.start }).andWhere("m.day <= :end", {
        end: range.end
      });
    }
    return qb;
  };

  if (range) {
    const useAccount = await useAccountMetricSnapshots(accountIds, range.start, range.end);
    const row = await buildQb(useAccount).getRawOne<{
      spend: string;
      impressions: string;
      clicks: string;
      conversions: string;
      reach: string;
      messages: string;
      roasAvg: string | null;
    }>();
    const totals = parseTotalsRow(row ?? {});
    if (useAccount && totals.spend <= 0 && totals.impressions <= 0 && totals.clicks <= 0) {
      const campRow = await buildQb(false).getRawOne();
      const campTotals = parseTotalsRow(campRow ?? {});
      if (campTotals.spend > 0 || campTotals.impressions > 0 || campTotals.clicks > 0) {
        return campTotals;
      }
    }
    return totals;
  }

  const row = await buildQb(true).getRawOne();
  if (row && Number(row.spend) > 0) return parseTotalsRow(row);
  return parseTotalsRow((await buildQb(false).getRawOne()) ?? {});
}

/** Série diária agregada no SQL (GROUP BY day). */
export async function loadMetricSeriesByDay(
  accountIds: string[],
  days = 30,
  opts?: { since?: string | null; until?: string | null; allTime?: boolean }
): Promise<MetricDayRow[]> {
  if (!accountIds.length) return [];

  const range = resolveDateRange(days, opts);
  if (!range && !opts?.allTime) return [];

  const { metricSnapshot: metricsRepo, campaignMetricSnapshot: campRepo } = await repositories();

  const buildQb = (useAccount: boolean) => {
    const qb = (useAccount ? metricsRepo : campRepo).createQueryBuilder("m");
    qb.select("m.day", "day")
      .addSelect("COALESCE(SUM(m.spend::numeric), 0)", "spend")
      .addSelect("COALESCE(SUM(m.impressions::bigint), 0)", "impressions")
      .addSelect("COALESCE(SUM(m.clicks::bigint), 0)", "clicks")
      .addSelect("COALESCE(SUM(m.conversions::bigint), 0)", "conversions")
      .addSelect("COALESCE(SUM(m.reach::bigint), 0)", "reach")
      .addSelect("COALESCE(SUM(m.messages::bigint), 0)", "messages")
      .addSelect("AVG(NULLIF(m.roas::numeric, 0))", "roasAvg")
      .where("m.adAccountId IN (:...accountIds)", { accountIds });
    if (range) {
      qb.andWhere("m.day >= :start", { start: range.start }).andWhere("m.day <= :end", {
        end: range.end
      });
    }
    qb.groupBy("m.day").orderBy("m.day", "ASC");
    return qb;
  };

  let rows: Array<{
    day: string;
    spend: string;
    impressions: string;
    clicks: string;
    conversions: string;
    reach: string;
    messages: string;
    roasAvg: string | null;
  }> = [];

  if (range) {
    const useAccount = await useAccountMetricSnapshots(accountIds, range.start, range.end);
    rows = await buildQb(useAccount).getRawMany();
  } else {
    rows = await buildQb(true).getRawMany();
    if (!rows.length) rows = await buildQb(false).getRawMany();
  }

  return rows.map((d) => ({
    day: normalizeDayKey(d.day),
    ...parseTotalsRow(d)
  }));
}

/** Totais por conta em duas janelas (variações). */
export async function loadAccountMetricWindows(
  accountIds: string[],
  curSince: string,
  curUntil: string,
  prevSince: string,
  prevUntil: string
): Promise<
  Map<
    string,
    { current: MetricTotals; previous: MetricTotals }
  >
> {
  const out = new Map<string, { current: MetricTotals; previous: MetricTotals }>();
  if (!accountIds.length) return out;

  const { metricSnapshot: metricsRepo, campaignMetricSnapshot: campRepo } = await repositories();
  const useAccount = await useAccountMetricSnapshots(accountIds, prevSince, curUntil);
  const qb = (useAccount ? metricsRepo : campRepo).createQueryBuilder("m");

  const rows = await qb
    .select("m.adAccountId", "adAccountId")
    .addSelect(
      `COALESCE(SUM(CASE WHEN m.day >= :curSince AND m.day <= :curUntil THEN m.spend::numeric ELSE 0 END), 0)`,
      "curSpend"
    )
    .addSelect(
      `COALESCE(SUM(CASE WHEN m.day >= :curSince AND m.day <= :curUntil THEN m.impressions::bigint ELSE 0 END), 0)`,
      "curImpressions"
    )
    .addSelect(
      `COALESCE(SUM(CASE WHEN m.day >= :curSince AND m.day <= :curUntil THEN m.clicks::bigint ELSE 0 END), 0)`,
      "curClicks"
    )
    .addSelect(
      `COALESCE(SUM(CASE WHEN m.day >= :curSince AND m.day <= :curUntil THEN m.conversions::bigint ELSE 0 END), 0)`,
      "curConversions"
    )
    .addSelect(
      `COALESCE(SUM(CASE WHEN m.day >= :curSince AND m.day <= :curUntil THEN m.reach::bigint ELSE 0 END), 0)`,
      "curReach"
    )
    .addSelect(
      `COALESCE(SUM(CASE WHEN m.day >= :curSince AND m.day <= :curUntil THEN m.messages::bigint ELSE 0 END), 0)`,
      "curMessages"
    )
    .addSelect(
      `AVG(CASE WHEN m.day >= :curSince AND m.day <= :curUntil AND m.roas::numeric > 0 THEN m.roas::numeric END)`,
      "curRoas"
    )
    .addSelect(
      `COALESCE(SUM(CASE WHEN m.day >= :prevSince AND m.day <= :prevUntil THEN m.spend::numeric ELSE 0 END), 0)`,
      "prevSpend"
    )
    .addSelect(
      `COALESCE(SUM(CASE WHEN m.day >= :prevSince AND m.day <= :prevUntil THEN m.impressions::bigint ELSE 0 END), 0)`,
      "prevImpressions"
    )
    .addSelect(
      `COALESCE(SUM(CASE WHEN m.day >= :prevSince AND m.day <= :prevUntil THEN m.clicks::bigint ELSE 0 END), 0)`,
      "prevClicks"
    )
    .addSelect(
      `COALESCE(SUM(CASE WHEN m.day >= :prevSince AND m.day <= :prevUntil THEN m.conversions::bigint ELSE 0 END), 0)`,
      "prevConversions"
    )
    .addSelect(
      `COALESCE(SUM(CASE WHEN m.day >= :prevSince AND m.day <= :prevUntil THEN m.reach::bigint ELSE 0 END), 0)`,
      "prevReach"
    )
    .addSelect(
      `COALESCE(SUM(CASE WHEN m.day >= :prevSince AND m.day <= :prevUntil THEN m.messages::bigint ELSE 0 END), 0)`,
      "prevMessages"
    )
    .addSelect(
      `AVG(CASE WHEN m.day >= :prevSince AND m.day <= :prevUntil AND m.roas::numeric > 0 THEN m.roas::numeric END)`,
      "prevRoas"
    )
    .where("m.adAccountId IN (:...accountIds)", { accountIds })
    .andWhere("m.day >= :prevSince", { prevSince })
    .andWhere("m.day <= :curUntil", { curUntil })
    .setParameters({ curSince, curUntil, prevSince, prevUntil, accountIds })
    .groupBy("m.adAccountId")
    .getRawMany<{
      adAccountId: string;
      curSpend: string;
      curImpressions: string;
      curClicks: string;
      curConversions: string;
      curReach: string;
      curMessages: string;
      curRoas: string | null;
      prevSpend: string;
      prevImpressions: string;
      prevClicks: string;
      prevConversions: string;
      prevReach: string;
      prevMessages: string;
      prevRoas: string | null;
    }>();

  for (const r of rows) {
    const cur = parseTotalsRow({
      spend: r.curSpend,
      impressions: r.curImpressions,
      clicks: r.curClicks,
      conversions: r.curConversions,
      reach: r.curReach,
      messages: r.curMessages,
      roasAvg: r.curRoas
    });
    const prev = parseTotalsRow({
      spend: r.prevSpend,
      impressions: r.prevImpressions,
      clicks: r.prevClicks,
      conversions: r.prevConversions,
      reach: r.prevReach,
      messages: r.prevMessages,
      roasAvg: r.prevRoas
    });
    out.set(r.adAccountId, { current: cur, previous: prev });
  }
  return out;
}

/**
 * Totais Google Ads agregados por clientId (silo separado; snapshots por cliente).
 * Devolve no mesmo formato MetricTotals — reach/messages não existem no Google.
 */
export async function loadGoogleMetricTotals(
  clientIds: string[],
  days = 30,
  opts?: { since?: string | null; until?: string | null; allTime?: boolean }
): Promise<MetricTotals> {
  if (!clientIds.length) return emptyTotals();
  const range = resolveDateRange(days, opts);
  const { googleCampaignMetricSnapshot: repo } = await repositories();

  const qb = repo
    .createQueryBuilder("g")
    .select("COALESCE(SUM(g.cost::numeric), 0)", "spend")
    .addSelect("COALESCE(SUM(g.impressions::bigint), 0)", "impressions")
    .addSelect("COALESCE(SUM(g.clicks::bigint), 0)", "clicks")
    .addSelect("COALESCE(SUM(g.conversions::numeric), 0)", "conversions")
    .addSelect(`COALESCE(SUM(g."conversionsValue"::numeric), 0)`, "convValue")
    .where("g.clientId IN (:...clientIds)", { clientIds });
  if (range) {
    qb.andWhere("g.day >= :start", { start: range.start }).andWhere("g.day <= :end", {
      end: range.end
    });
  }

  let row: {
    spend: string;
    impressions: string;
    clicks: string;
    conversions: string;
    convValue: string;
  } | undefined;
  try {
    row = await qb.getRawOne();
  } catch {
    // Silo Google não pode derrubar o dashboard (ex.: tabela ainda não migrada).
    return emptyTotals();
  }
  const spend = Number(row?.spend) || 0;
  const convValue = Number(row?.convValue) || 0;
  return {
    spend,
    impressions: Number(row?.impressions) || 0,
    clicks: Number(row?.clicks) || 0,
    conversions: Number(row?.conversions) || 0,
    reach: 0,
    messages: 0,
    roas: spend > 0 ? convValue / spend : 0
  };
}

/** Série diária Google Ads agregada por dia (GROUP BY day) para os clientes dados. */
export async function loadGoogleMetricSeriesByDay(
  clientIds: string[],
  days = 30,
  opts?: { since?: string | null; until?: string | null; allTime?: boolean }
): Promise<MetricDayRow[]> {
  if (!clientIds.length) return [];
  const range = resolveDateRange(days, opts);
  if (!range && !opts?.allTime) return [];
  const { googleCampaignMetricSnapshot: repo } = await repositories();

  const qb = repo
    .createQueryBuilder("g")
    .select("g.day", "day")
    .addSelect("COALESCE(SUM(g.cost::numeric), 0)", "spend")
    .addSelect("COALESCE(SUM(g.impressions::bigint), 0)", "impressions")
    .addSelect("COALESCE(SUM(g.clicks::bigint), 0)", "clicks")
    .addSelect("COALESCE(SUM(g.conversions::numeric), 0)", "conversions")
    .addSelect(`COALESCE(SUM(g."conversionsValue"::numeric), 0)`, "convValue")
    .where("g.clientId IN (:...clientIds)", { clientIds });
  if (range) {
    qb.andWhere("g.day >= :start", { start: range.start }).andWhere("g.day <= :end", {
      end: range.end
    });
  }
  qb.groupBy("g.day").orderBy("g.day", "ASC");

  let rows: Array<{
    day: string;
    spend: string;
    impressions: string;
    clicks: string;
    conversions: string;
    convValue: string;
  }> = [];
  try {
    rows = await qb.getRawMany();
  } catch {
    return [];
  }

  return rows.map((d) => {
    const spend = Number(d.spend) || 0;
    const convValue = Number(d.convValue) || 0;
    return {
      day: normalizeDayKey(d.day),
      spend,
      impressions: Number(d.impressions) || 0,
      clicks: Number(d.clicks) || 0,
      conversions: Number(d.conversions) || 0,
      reach: 0,
      messages: 0,
      roas: spend > 0 ? convValue / spend : 0
    };
  });
}

/** Soma dois conjuntos de totais (ex.: Meta + Google). */
export function mergeMetricTotals(a: MetricTotals, b: MetricTotals): MetricTotals {
  const roas = a.roas > 0 && b.roas > 0 ? (a.roas + b.roas) / 2 : a.roas || b.roas;
  return {
    spend: a.spend + b.spend,
    impressions: a.impressions + b.impressions,
    clicks: a.clicks + b.clicks,
    conversions: a.conversions + b.conversions,
    reach: a.reach + b.reach,
    messages: a.messages + b.messages,
    roas
  };
}

/** Mescla duas séries diárias por dia (soma métricas; roas prefere Meta, cai no Google). */
export function mergeMetricSeries(a: MetricDayRow[], b: MetricDayRow[]): MetricDayRow[] {
  const byDay = new Map<string, MetricDayRow>();
  for (const d of a) byDay.set(d.day, { ...d });
  for (const d of b) {
    const e = byDay.get(d.day);
    if (!e) {
      byDay.set(d.day, { ...d });
      continue;
    }
    e.spend += d.spend;
    e.impressions += d.impressions;
    e.clicks += d.clicks;
    e.conversions += d.conversions;
    e.reach += d.reach;
    e.messages += d.messages;
    e.roas = e.roas > 0 && d.roas > 0 ? (e.roas + d.roas) / 2 : e.roas || d.roas;
  }
  return [...byDay.values()].sort((x, y) => x.day.localeCompare(y.day));
}

/** @deprecated Prefer loadMetricTotals / loadMetricSeriesByDay */
export async function loadMetricRows(
  accountIds: string[],
  days = 30,
  opts?: { since?: string | null; until?: string | null; allTime?: boolean }
) {
  const series = await loadMetricSeriesByDay(accountIds, days, opts);
  return series.map((d) => ({
    adAccountId: accountIds[0],
    day: d.day,
    spend: String(d.spend),
    impressions: String(d.impressions),
    clicks: String(d.clicks),
    conversions: String(d.conversions),
    reach: String(d.reach),
    messages: String(d.messages),
    roas: String(d.roas)
  }));
}
