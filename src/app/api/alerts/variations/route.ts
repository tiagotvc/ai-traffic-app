import { NextResponse } from "next/server";
import { Between, In } from "typeorm";

import { repositories } from "@/db/repositories";
import { getAppContext, listClientsForTenant, slugify } from "@/lib/app-context";
import { addDaysIso, todayIso } from "@/lib/report-period";

type Level = "general" | "client" | "campaign";

type MetricKey =
  | "spend"
  | "conversions"
  | "roas"
  | "cpa"
  | "ctr"
  | "cpc"
  | "cpm"
  | "messages"
  | "reach";

// Métricas avaliadas e a direção "boa" de cada uma.
const EVAL_METRICS: MetricKey[] = [
  "roas",
  "conversions",
  "cpa",
  "ctr",
  "cpc",
  "cpm",
  "spend",
  "messages",
  "reach"
];
const GOOD_WHEN_UP = new Set<MetricKey>(["roas", "conversions", "ctr", "messages", "reach"]);
const GOOD_WHEN_DOWN = new Set<MetricKey>(["cpa", "cpc", "cpm"]); // mais barato = melhor
// "spend" é neutro (nem bom nem ruim por si só).

const INCLUDE_THRESHOLD = 20; // % mínimo para virar um item
const CRITICAL_THRESHOLD = 40; // % para severidade crítica (quando é piora)

type MetricRow = {
  day: string;
  spend: string | number;
  impressions: string | number;
  clicks: string | number;
  conversions: string | number;
  reach?: string | number;
  messages?: string | number;
  roas: string | number;
};

function agg(rows: MetricRow[]) {
  let spend = 0;
  let impressions = 0;
  let clicks = 0;
  let conversions = 0;
  let reach = 0;
  let messages = 0;
  let roasSum = 0;
  let roasCount = 0;
  for (const r of rows) {
    spend += Number(r.spend) || 0;
    impressions += Number(r.impressions) || 0;
    clicks += Number(r.clicks) || 0;
    conversions += Number(r.conversions) || 0;
    reach += Number(r.reach) || 0;
    messages += Number(r.messages) || 0;
    const roas = Number(r.roas);
    if (!Number.isNaN(roas) && roas > 0) {
      roasSum += roas;
      roasCount += 1;
    }
  }
  return {
    spend,
    conversions,
    reach,
    messages,
    roas: roasCount ? roasSum / roasCount : 0,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    cpa: conversions > 0 ? spend / conversions : 0
  } as Record<MetricKey, number>;
}

type VariationItem = {
  id: string;
  entityType: Level;
  entityName: string | null;
  clientSlug: string | null;
  metaCampaignId: string | null;
  metric: MetricKey;
  currentValue: number;
  previousValue: number;
  deltaPct: number;
  direction: "up" | "down";
  severity: "critical" | "warning" | "positive";
};

function buildItems(
  idPrefix: string,
  entityType: Level,
  entityName: string | null,
  clientSlug: string | null,
  metaCampaignId: string | null,
  cur: Record<MetricKey, number>,
  prev: Record<MetricKey, number>
): VariationItem[] {
  const items: VariationItem[] = [];
  for (const metric of EVAL_METRICS) {
    const c = cur[metric];
    const p = prev[metric];
    if (!p || p <= 0) continue; // sem base anterior
    const deltaPct = ((c - p) / p) * 100;
    if (Math.abs(deltaPct) < INCLUDE_THRESHOLD) continue;
    const direction: "up" | "down" = deltaPct >= 0 ? "up" : "down";
    const isBad =
      (direction === "up" && GOOD_WHEN_DOWN.has(metric)) ||
      (direction === "down" && GOOD_WHEN_UP.has(metric));
    const isGood =
      (direction === "up" && GOOD_WHEN_UP.has(metric)) ||
      (direction === "down" && GOOD_WHEN_DOWN.has(metric));
    let severity: VariationItem["severity"];
    if (isBad) severity = Math.abs(deltaPct) >= CRITICAL_THRESHOLD ? "critical" : "warning";
    else if (isGood) severity = "positive";
    else severity = "warning"; // spend (neutro): destaca como atenção
    items.push({
      id: `${idPrefix}:${metric}`,
      entityType,
      entityName,
      clientSlug,
      metaCampaignId,
      metric,
      currentValue: c,
      previousValue: p,
      deltaPct,
      direction,
      severity
    });
  }
  return items;
}

const SEVERITY_RANK = { critical: 0, warning: 1, positive: 2 } as const;

export async function GET(req: Request) {
  const { tenant } = await getAppContext();
  const url = new URL(req.url);
  const daysRaw = Number(url.searchParams.get("days") ?? "30");
  const days = Math.min(90, Math.max(1, Number.isFinite(daysRaw) ? Math.floor(daysRaw) : 30));
  const level = (url.searchParams.get("level") as Level) || "general";
  const clientIdFilter = url.searchParams.get("clientId") || null;

  const today = todayIso();
  const curUntil = today;
  const curSince = addDaysIso(today, -(days - 1));
  const prevUntil = addDaysIso(curSince, -1);
  const prevSince = addDaysIso(prevUntil, -(days - 1));

  const { adAccount: adAccountRepo, metricSnapshot: metricsRepo, campaignMetricSnapshot: campRepo } =
    await repositories();

  const clients = await listClientsForTenant(tenant.id);
  const clientById = new Map(clients.map((c) => [c.id, c]));
  // Aceita id OU slug do cliente (o Destaques passa o slug).
  const filterClient = clientIdFilter
    ? clients.find((c) => c.id === clientIdFilter || slugify(c.name) === clientIdFilter)
    : null;
  let accounts = clients.length
    ? await adAccountRepo.find({ where: { clientId: In(clients.map((c) => c.id)) } })
    : [];
  if (clientIdFilter) accounts = accounts.filter((a) => a.clientId === filterClient?.id);

  const accountIds = accounts.map((a) => a.id);
  const accountToClient = new Map(accounts.map((a) => [a.id, a.clientId]));

  const window = { curSince, curUntil, prevSince, prevUntil };
  if (!accountIds.length) {
    return NextResponse.json({ ok: true, items: [], window, level });
  }

  let items: VariationItem[] = [];

  if (level === "campaign") {
    const rows = await campRepo.find({
      where: { adAccountId: In(accountIds), day: Between(prevSince, curUntil) }
    });
    const groups = new Map<string, { name: string | null; slug: string | null; rows: typeof rows }>();
    for (const r of rows) {
      const g = groups.get(r.metaCampaignId) ?? {
        name: r.campaignName ?? r.metaCampaignId,
        slug: (() => {
          const clientId = accountToClient.get(r.adAccountId);
          const cl = clientId ? clientById.get(clientId) : null;
          return cl ? slugify(cl.name) : null;
        })(),
        rows: [] as typeof rows
      };
      g.rows.push(r);
      groups.set(r.metaCampaignId, g);
    }
    for (const [campaignId, g] of groups) {
      const cur = agg(g.rows.filter((r) => r.day >= curSince && r.day <= curUntil));
      const prev = agg(g.rows.filter((r) => r.day >= prevSince && r.day <= prevUntil));
      items.push(
        ...buildItems(`camp:${campaignId}`, "campaign", g.name, g.slug, campaignId, cur, prev)
      );
    }
  } else {
    const rows = await metricsRepo.find({
      where: { adAccountId: In(accountIds), day: Between(prevSince, curUntil) }
    });

    if (level === "client") {
      const groups = new Map<string, MetricRow[]>();
      for (const r of rows) {
        const clientId = accountToClient.get(r.adAccountId);
        if (!clientId) continue;
        const arr = groups.get(clientId) ?? [];
        arr.push(r);
        groups.set(clientId, arr);
      }
      for (const [clientId, grp] of groups) {
        const cl = clientById.get(clientId);
        if (!cl) continue;
        const cur = agg(grp.filter((r) => r.day >= curSince && r.day <= curUntil));
        const prev = agg(grp.filter((r) => r.day >= prevSince && r.day <= prevUntil));
        items.push(
          ...buildItems(`client:${clientId}`, "client", cl.name, slugify(cl.name), null, cur, prev)
        );
      }
    } else {
      const cur = agg(rows.filter((r) => r.day >= curSince && r.day <= curUntil));
      const prev = agg(rows.filter((r) => r.day >= prevSince && r.day <= prevUntil));
      items = buildItems("general", "general", null, null, null, cur, prev);
    }
  }

  items.sort((a, b) => {
    const s = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (s !== 0) return s;
    return Math.abs(b.deltaPct) - Math.abs(a.deltaPct);
  });

  const counts = {
    total: items.length,
    worse: items.filter((i) => i.severity !== "positive").length,
    better: items.filter((i) => i.severity === "positive").length
  };

  return NextResponse.json({ ok: true, items, counts, window, level });
}
