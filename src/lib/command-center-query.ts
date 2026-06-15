import "server-only";

import { In } from "typeorm";

import { getDataSource } from "@/db/data-source";
import { repositories } from "@/db/repositories";
import { slugify } from "@/lib/app-context";
import { matchesClientBusinessScope } from "@/lib/client-meta-business";
import { rollingDaysEndingYesterday, yesterdayIso } from "@/lib/report-period";

export type CommandCenterCampaignRow = {
  metaCampaignId: string;
  campaignName: string;
  clientId: string;
  clientName: string;
  clientSlug: string;
  clientTag: string | null;
  adAccountId: string;
  accountLabel: string;
  metaAdAccountId: string;
  spend: number;
  conversions: number;
  leads: number;
  cpl: number | null;
  cpa: number | null;
  roas: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  reach: number;
  messages: number;
  frequency: number;
  status: string;
  alertCount: number;
  hasAlert: boolean;
  dailyBudget?: number | null;
};

export type CommandCenterTotals = {
  spend: number;
  conversions: number;
  leads: number;
  impressions: number;
  clicks: number;
};

type AggRow = {
  metaCampaignId: string;
  adAccountId: string;
  campaign_name: string | null;
  spend: string | number;
  conversions: string | number;
  leads: string | number;
  impressions: string | number;
  clicks: string | number;
  reach: string | number;
  messages: string | number;
  roas: string | number;
  campaign_status: string | null;
  daily_budget: string | number | null;
  clientId: string;
  metaAdAccountId: string;
  account_label: string | null;
  client_name: string;
  alert_count: string | number;
};

const SORT_SQL: Record<string, string> = {
  spend: "sub.spend",
  conversions: "sub.conversions",
  leads: "sub.leads",
  roas: "sub.roas",
  impressions: "sub.impressions",
  clicks: "sub.clicks",
  ctr: "sub.ctr",
  cpc: "sub.cpc",
  cpm: "sub.cpm",
  budget: "sub.daily_budget",
  alerts: "sub.alert_count",
  cpl: "sub.cpl",
  cpa: "sub.cpa",
  campaign: "sub.campaign_name",
  campaignId: 'sub."metaCampaignId"',
  client: "sub.client_name",
  account: "sub.account_label",
  status: "sub.campaign_status"
};

function num(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mapAggRow(r: AggRow, clientTag: string | null): CommandCenterCampaignRow {
  const spend = num(r.spend);
  const conversions = num(r.conversions);
  const leads = num(r.leads);
  const impressions = num(r.impressions);
  const clicks = num(r.clicks);
  const reach = num(r.reach);
  const messages = num(r.messages);
  const alertCount = num(r.alert_count);
  return {
    metaCampaignId: r.metaCampaignId,
    campaignName: r.campaign_name ?? r.metaCampaignId,
    clientId: r.clientId,
    clientName: r.client_name ?? "—",
    clientSlug: r.client_name ? slugify(r.client_name) : "",
    clientTag,
    adAccountId: r.adAccountId,
    accountLabel: r.account_label ?? r.metaAdAccountId ?? "—",
    metaAdAccountId: r.metaAdAccountId ?? "",
    spend,
    conversions,
    leads,
    cpl: leads > 0 ? spend / leads : null,
    cpa: conversions > 0 ? spend / conversions : null,
    roas: num(r.roas),
    impressions,
    clicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    reach,
    messages,
    frequency: reach > 0 ? impressions / reach : 0,
    status: r.campaign_status ?? "UNKNOWN",
    alertCount,
    hasAlert: alertCount > 0,
    dailyBudget: r.daily_budget != null ? num(r.daily_budget) : null
  };
}

function buildFilteredSubquery(input: {
  accountIds: string[];
  since: string;
  until: string;
  tenantId: string;
  statusFilter: string;
  onlyAlerts: boolean;
  hideZeroActivity: boolean;
  searchQ: string;
}): { sql: string; params: unknown[] } {
  const params: unknown[] = [input.accountIds, input.since, input.until, input.tenantId];

  let statusClause = "";
  if (input.statusFilter === "ACTIVE") {
    statusClause = ` AND agg.campaign_status = 'ACTIVE'`;
  } else if (input.statusFilter === "PAUSED") {
    statusClause = ` AND agg.campaign_status = 'PAUSED'`;
  } else if (input.statusFilter === "INACTIVE") {
    statusClause = ` AND COALESCE(agg.campaign_status, 'UNKNOWN') <> 'ACTIVE'`;
  }

  const alertsClause = input.onlyAlerts ? ` AND COALESCE(al.cnt, 0) > 0` : "";

  const zeroClause = input.hideZeroActivity
    ? ` AND (
        agg.spend > 0 OR agg.conversions > 0 OR agg.impressions > 0
        OR COALESCE(al.cnt, 0) > 0
        OR (agg.campaign_status = 'ACTIVE' AND COALESCE(agg.daily_budget, 0) > 0)
      )`
    : "";

  let searchClause = "";
  if (input.searchQ.length > 0) {
    const searchParam = `$${params.length + 1}`;
    params.push(`%${input.searchQ.toLowerCase()}%`);
    searchClause = ` AND (
          LOWER(COALESCE(agg.campaign_name, '')) LIKE ${searchParam}
          OR LOWER(c.name) LIKE ${searchParam}
          OR LOWER(COALESCE(a.label, a."metaAdAccountId", '')) LIKE ${searchParam}
          OR LOWER(agg."metaCampaignId") LIKE ${searchParam}
        )`;
  }

  const sql = `
    WITH agg AS (
      SELECT
        s."metaCampaignId",
        s."adAccountId",
        MAX(s."campaignName") AS campaign_name,
        COALESCE(SUM(s.spend::numeric), 0) AS spend,
        COALESCE(SUM(s.conversions::bigint), 0) AS conversions,
        COALESCE(SUM(s.leads::bigint), 0) AS leads,
        COALESCE(SUM(s.impressions::bigint), 0) AS impressions,
        COALESCE(SUM(s.clicks::bigint), 0) AS clicks,
        COALESCE(SUM(s.reach::bigint), 0) AS reach,
        COALESCE(SUM(s.messages::bigint), 0) AS messages,
        CASE
          WHEN SUM(CASE WHEN s.roas::numeric > 0 THEN 1 ELSE 0 END) > 0
          THEN AVG(CASE WHEN s.roas::numeric > 0 THEN s.roas::numeric ELSE NULL END)
          ELSE 0
        END AS roas,
        (ARRAY_AGG(s."campaignStatus" ORDER BY s.day DESC NULLS LAST)
          FILTER (WHERE s."campaignStatus" IS NOT NULL))[1] AS campaign_status,
        MAX(s."dailyBudget"::numeric) AS daily_budget
      FROM campaign_metric_snapshots s
      WHERE s."adAccountId" = ANY($1::uuid[])
        AND s.day >= $2::date
        AND s.day <= $3::date
      GROUP BY s."metaCampaignId", s."adAccountId"
    )
    SELECT
      agg."metaCampaignId",
      agg."adAccountId",
      agg.campaign_name,
      agg.spend,
      agg.conversions,
      agg.leads,
      agg.impressions,
      agg.clicks,
      agg.reach,
      agg.messages,
      agg.roas,
      agg.campaign_status,
      agg.daily_budget,
      a."clientId",
      a."metaAdAccountId",
      COALESCE(a.label, a."metaAdAccountId") AS account_label,
      c.name AS client_name,
      COALESCE(al.cnt, 0) AS alert_count,
      CASE WHEN agg.leads > 0 THEN agg.spend / agg.leads ELSE NULL END AS cpl,
      CASE WHEN agg.conversions > 0 THEN agg.spend / agg.conversions ELSE NULL END AS cpa,
      CASE WHEN agg.impressions > 0 THEN (agg.clicks::numeric / agg.impressions) * 100 ELSE 0 END AS ctr,
      CASE WHEN agg.clicks > 0 THEN agg.spend / agg.clicks ELSE 0 END AS cpc,
      CASE WHEN agg.impressions > 0 THEN (agg.spend / agg.impressions) * 1000 ELSE 0 END AS cpm
    FROM agg
    JOIN ad_accounts a ON a.id = agg."adAccountId"
    JOIN clients c ON c.id = a."clientId"
    LEFT JOIN (
      SELECT "metaCampaignId", COUNT(*)::int AS cnt
      FROM alerts
      WHERE "tenantId" = $4 AND dismissed = false AND "metaCampaignId" IS NOT NULL
      GROUP BY "metaCampaignId"
    ) al ON al."metaCampaignId" = agg."metaCampaignId"
    WHERE c."tenantId" = $4
    ${statusClause}
    ${alertsClause}
    ${zeroClause}
    ${searchClause}
  `;

  return { sql, params };
}

async function queryAggregatedCampaigns(input: {
  accountIds: string[];
  since: string;
  until: string;
  tenantId: string;
  statusFilter: string;
  onlyAlerts: boolean;
  hideZeroActivity: boolean;
  searchQ: string;
  sort?: string | null;
  sortDir?: "asc" | "desc";
  limit: number;
  offset: number;
  clientTagsByClientId: Map<string, string[]>;
  skipAggregates?: boolean;
}): Promise<{ rows: CommandCenterCampaignRow[]; total: number; totals: CommandCenterTotals }> {
  const ds = await getDataSource();
  const { sql: baseSql, params } = buildFilteredSubquery({
    accountIds: input.accountIds,
    since: input.since,
    until: input.until,
    tenantId: input.tenantId,
    statusFilter: input.statusFilter,
    onlyAlerts: input.onlyAlerts,
    hideZeroActivity: input.hideZeroActivity,
    searchQ: input.searchQ
  });

  let total = 0;
  let totals: CommandCenterTotals = emptyTotals();

  if (!input.skipAggregates) {
    const countRows = await ds.query(
      `SELECT COUNT(*)::int AS cnt FROM (${baseSql}) sub`,
      params
    );
    total = num(countRows[0]?.cnt);

    const sumRows = await ds.query(
      `SELECT
        COALESCE(SUM(sub.spend), 0) AS spend,
        COALESCE(SUM(sub.conversions), 0) AS conversions,
        COALESCE(SUM(sub.leads), 0) AS leads,
        COALESCE(SUM(sub.impressions), 0) AS impressions,
        COALESCE(SUM(sub.clicks), 0) AS clicks
      FROM (${baseSql}) sub`,
      params
    );

    totals = {
      spend: num(sumRows[0]?.spend),
      conversions: num(sumRows[0]?.conversions),
      leads: num(sumRows[0]?.leads),
      impressions: num(sumRows[0]?.impressions),
      clicks: num(sumRows[0]?.clicks)
    };
  }

  const sortCol = input.sort && SORT_SQL[input.sort] ? SORT_SQL[input.sort] : null;
  const dir = input.sortDir === "asc" ? "ASC" : "DESC";
  const nulls = input.sortDir === "asc" ? "NULLS FIRST" : "NULLS LAST";
  const orderBy = sortCol
    ? `${sortCol} ${dir} ${nulls}, sub.alert_count DESC, sub.spend DESC`
    : "sub.alert_count DESC, sub.spend DESC, sub.campaign_name ASC";

  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;
  const pageRows = (await ds.query(
    `SELECT * FROM (${baseSql}) sub ORDER BY ${orderBy} LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    [...params, input.limit, input.offset]
  )) as AggRow[];

  const rows = pageRows.map((r) => {
    const tags = input.clientTagsByClientId.get(r.clientId) ?? [];
    return mapAggRow(r, tags[0] ?? null);
  });

  if (input.skipAggregates) {
    total = rows.length;
  }

  return { rows, total, totals };
}

export async function queryCommandCenterCampaigns(input: {
  tenantId: string;
  clientIds?: string[] | null;
  q?: string;
  onlyAlerts?: boolean;
  onlyActive?: boolean;
  statusFilter?: "ACTIVE" | "PAUSED" | "INACTIVE" | "ALL";
  tag?: string;
  days?: number;
  since?: string | null;
  until?: string | null;
  allTime?: boolean;
  limit?: number;
  offset?: number;
  metaBusinessId?: string | null;
  sort?: string | null;
  sortDir?: "asc" | "desc";
  hideZeroActivity?: boolean;
  includeTotals?: boolean;
  /** Pula COUNT/SUM — só busca linhas (mais rápido no Command Center). */
  skipAggregates?: boolean;
}): Promise<{
  rows: CommandCenterCampaignRow[];
  total: number;
  totals?: CommandCenterTotals;
}> {
  const {
    client: clientRepo,
    adAccount: adRepo,
    clientTag: tagRepo
  } = await repositories();

  const defaultRange = rollingDaysEndingYesterday(input.days ?? 7);
  const since =
    input.allTime || !input.since
      ? input.allTime
        ? "1970-01-01"
        : defaultRange.since
      : input.since.slice(0, 10);
  const until = input.until?.slice(0, 10) ?? (input.allTime ? yesterdayIso() : defaultRange.until);

  let clients = await clientRepo.find({ where: { tenantId: input.tenantId }, order: { name: "ASC" } });
  if (input.clientIds?.length) {
    clients = clients.filter((c) => input.clientIds!.includes(c.id));
  }
  if (input.tag?.trim()) {
    const tagged = await tagRepo.find({ where: { tag: input.tag.trim() } });
    const ids = new Set(tagged.map((t) => t.clientId));
    clients = clients.filter((c) => ids.has(c.id));
  }

  const clientIds = clients.map((c) => c.id);
  if (!clientIds.length) {
    return { rows: [], total: 0, totals: emptyTotals() };
  }

  let accounts = await adRepo.find({ where: { clientId: In(clientIds) } });
  const clientBm = input.metaBusinessId?.trim() || null;
  if (clientBm) {
    accounts = accounts.filter((a) => matchesClientBusinessScope(a.metaBusinessId, clientBm));
  }
  const accountIds = accounts.map((a) => a.id);
  if (!accountIds.length) {
    return { rows: [], total: 0, totals: emptyTotals() };
  }

  const tags = await tagRepo.find({ where: { clientId: In(clientIds) } });
  const clientTagsByClientId = new Map<string, string[]>();
  for (const tag of tags) {
    const list = clientTagsByClientId.get(tag.clientId) ?? [];
    list.push(tag.tag);
    clientTagsByClientId.set(tag.clientId, list);
  }

  let statusFilter = input.statusFilter ?? "ALL";
  if (input.onlyActive) statusFilter = "ACTIVE";

  const result = await queryAggregatedCampaigns({
    accountIds,
    since,
    until,
    tenantId: input.tenantId,
    statusFilter,
    onlyAlerts: input.onlyAlerts ?? false,
    hideZeroActivity: input.hideZeroActivity ?? false,
    searchQ: input.q?.trim() ?? "",
    sort: input.sort,
    sortDir: input.sortDir,
    limit: input.limit ?? 100,
    offset: input.offset ?? 0,
    clientTagsByClientId,
    skipAggregates: input.skipAggregates
  });

  return {
    rows: result.rows,
    total: result.total,
    totals: input.includeTotals !== false ? result.totals : undefined
  };
}

function emptyTotals(): CommandCenterTotals {
  return { spend: 0, conversions: 0, leads: 0, impressions: 0, clicks: 0 };
}

export type CampaignCompareRow = {
  metaCampaignId: string;
  campaignName: string;
  clientName: string;
  clientSlug: string;
  spendA: number;
  spendB: number;
  conversionsA: number;
  conversionsB: number;
  leadsA: number;
  leadsB: number;
  cpaA: number | null;
  cpaB: number | null;
  roasA: number;
  roasB: number;
  impressionsA: number;
  impressionsB: number;
};

export async function queryCampaignComparison(input: {
  tenantId: string;
  clientIds?: string[] | null;
  metaBusinessId?: string | null;
  sinceA: string;
  untilA: string;
  sinceB: string;
  untilB: string;
  q?: string;
}): Promise<{ rows: CampaignCompareRow[] }> {
  const base = {
    tenantId: input.tenantId,
    clientIds: input.clientIds,
    metaBusinessId: input.metaBusinessId,
    q: input.q,
    limit: 500,
    offset: 0,
    includeTotals: false as const,
    skipAggregates: true as const
  };

  const [periodA, periodB] = await Promise.all([
    queryCommandCenterCampaigns({ ...base, since: input.sinceA, until: input.untilA }),
    queryCommandCenterCampaigns({ ...base, since: input.sinceB, until: input.untilB })
  ]);

  const byId = new Map<string, CampaignCompareRow>();

  for (const r of periodA.rows) {
    byId.set(r.metaCampaignId, {
      metaCampaignId: r.metaCampaignId,
      campaignName: r.campaignName,
      clientName: r.clientName,
      clientSlug: r.clientSlug,
      spendA: r.spend,
      spendB: 0,
      conversionsA: r.conversions,
      conversionsB: 0,
      leadsA: r.leads,
      leadsB: 0,
      cpaA: r.cpa,
      cpaB: null,
      roasA: r.roas,
      roasB: 0,
      impressionsA: r.impressions,
      impressionsB: 0
    });
  }

  for (const r of periodB.rows) {
    const cur = byId.get(r.metaCampaignId);
    if (cur) {
      cur.spendB = r.spend;
      cur.conversionsB = r.conversions;
      cur.leadsB = r.leads;
      cur.cpaB = r.cpa;
      cur.roasB = r.roas;
      cur.impressionsB = r.impressions;
    } else {
      byId.set(r.metaCampaignId, {
        metaCampaignId: r.metaCampaignId,
        campaignName: r.campaignName,
        clientName: r.clientName,
        clientSlug: r.clientSlug,
        spendA: 0,
        spendB: r.spend,
        conversionsA: 0,
        conversionsB: r.conversions,
        leadsA: 0,
        leadsB: r.leads,
        cpaA: null,
        cpaB: r.cpa,
        roasA: 0,
        roasB: r.roas,
        impressionsA: 0,
        impressionsB: r.impressions
      });
    }
  }

  return { rows: [...byId.values()].sort((a, b) => b.spendA - a.spendA) };
}
