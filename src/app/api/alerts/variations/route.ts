import { NextResponse } from "next/server";
import { In } from "typeorm";

import { repositories } from "@/db/repositories";
import { getAppContext, listClientsForTenant, slugify } from "@/lib/app-context";
import { loadAccountMetricWindows, type MetricTotals } from "@/lib/dashboard-query";
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

const INCLUDE_THRESHOLD = 20;
const CRITICAL_THRESHOLD = 40;

function totalsToAgg(t: MetricTotals): Record<MetricKey, number> {
  const spend = t.spend;
  const impressions = t.impressions;
  const clicks = t.clicks;
  const conversions = t.conversions;
  const reach = t.reach;
  const messages = t.messages;
  return {
    spend,
    conversions,
    reach,
    messages,
    roas: t.roas,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    cpa: conversions > 0 ? spend / conversions : 0
  };
}

function sumTotals(list: MetricTotals[]): MetricTotals {
  let spend = 0;
  let impressions = 0;
  let clicks = 0;
  let conversions = 0;
  let reach = 0;
  let messages = 0;
  let roasSum = 0;
  let roasCount = 0;
  for (const t of list) {
    spend += t.spend;
    impressions += t.impressions;
    clicks += t.clicks;
    conversions += t.conversions;
    reach += t.reach;
    messages += t.messages;
    if (t.roas > 0) {
      roasSum += t.roas;
      roasCount += 1;
    }
  }
  return {
    spend,
    impressions,
    clicks,
    conversions,
    reach,
    messages,
    roas: roasCount ? roasSum / roasCount : 0
  };
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

export const maxDuration = 30;

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

  const { adAccount: adAccountRepo, campaignMetricSnapshot: campRepo } = await repositories();

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
    const rows = await campRepo
      .createQueryBuilder("s")
      .select("s.metaCampaignId", "metaCampaignId")
      .addSelect("MAX(s.campaignName)", "campaignName")
      .addSelect("MAX(s.adAccountId)", "adAccountId")
      .addSelect(
        `COALESCE(SUM(CASE WHEN s.day >= :curSince AND s.day <= :curUntil THEN s.spend::numeric ELSE 0 END), 0)`,
        "curSpend"
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN s.day >= :curSince AND s.day <= :curUntil THEN s.impressions::bigint ELSE 0 END), 0)`,
        "curImpressions"
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN s.day >= :curSince AND s.day <= :curUntil THEN s.clicks::bigint ELSE 0 END), 0)`,
        "curClicks"
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN s.day >= :curSince AND s.day <= :curUntil THEN s.conversions::bigint ELSE 0 END), 0)`,
        "curConversions"
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN s.day >= :curSince AND s.day <= :curUntil THEN s.reach::bigint ELSE 0 END), 0)`,
        "curReach"
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN s.day >= :curSince AND s.day <= :curUntil THEN s.messages::bigint ELSE 0 END), 0)`,
        "curMessages"
      )
      .addSelect(
        `AVG(CASE WHEN s.day >= :curSince AND s.day <= :curUntil AND s.roas::numeric > 0 THEN s.roas::numeric END)`,
        "curRoas"
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN s.day >= :prevSince AND s.day <= :prevUntil THEN s.spend::numeric ELSE 0 END), 0)`,
        "prevSpend"
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN s.day >= :prevSince AND s.day <= :prevUntil THEN s.impressions::bigint ELSE 0 END), 0)`,
        "prevImpressions"
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN s.day >= :prevSince AND s.day <= :prevUntil THEN s.clicks::bigint ELSE 0 END), 0)`,
        "prevClicks"
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN s.day >= :prevSince AND s.day <= :prevUntil THEN s.conversions::bigint ELSE 0 END), 0)`,
        "prevConversions"
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN s.day >= :prevSince AND s.day <= :prevUntil THEN s.reach::bigint ELSE 0 END), 0)`,
        "prevReach"
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN s.day >= :prevSince AND s.day <= :prevUntil THEN s.messages::bigint ELSE 0 END), 0)`,
        "prevMessages"
      )
      .addSelect(
        `AVG(CASE WHEN s.day >= :prevSince AND s.day <= :prevUntil AND s.roas::numeric > 0 THEN s.roas::numeric END)`,
        "prevRoas"
      )
      .where("s.adAccountId IN (:...accountIds)", { accountIds })
      .andWhere("s.day >= :prevSince", { prevSince })
      .andWhere("s.day <= :curUntil", { curUntil })
      .setParameters({ curSince, curUntil, prevSince, prevUntil, accountIds })
      .groupBy("s.metaCampaignId")
      .getRawMany<{
        metaCampaignId: string;
        campaignName: string | null;
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
      const clientId = accountToClient.get(r.adAccountId);
      const cl = clientId ? clientById.get(clientId) : null;
      const cur = totalsToAgg({
        spend: Number(r.curSpend) || 0,
        impressions: Number(r.curImpressions) || 0,
        clicks: Number(r.curClicks) || 0,
        conversions: Number(r.curConversions) || 0,
        reach: Number(r.curReach) || 0,
        messages: Number(r.curMessages) || 0,
        roas: Number(r.curRoas) || 0
      });
      const prev = totalsToAgg({
        spend: Number(r.prevSpend) || 0,
        impressions: Number(r.prevImpressions) || 0,
        clicks: Number(r.prevClicks) || 0,
        conversions: Number(r.prevConversions) || 0,
        reach: Number(r.prevReach) || 0,
        messages: Number(r.prevMessages) || 0,
        roas: Number(r.prevRoas) || 0
      });
      items.push(
        ...buildItems(
          `camp:${r.metaCampaignId}`,
          "campaign",
          r.campaignName ?? r.metaCampaignId,
          cl ? slugify(cl.name) : null,
          r.metaCampaignId,
          cur,
          prev
        )
      );
    }
  } else {
    const byAccount = await loadAccountMetricWindows(
      accountIds,
      curSince,
      curUntil,
      prevSince,
      prevUntil
    );

    if (level === "client") {
      const byClient = new Map<string, { current: MetricTotals[]; previous: MetricTotals[] }>();
      for (const [accountId, windows] of byAccount) {
        const clientId = accountToClient.get(accountId);
        if (!clientId) continue;
        const bucket = byClient.get(clientId) ?? { current: [], previous: [] };
        bucket.current.push(windows.current);
        bucket.previous.push(windows.previous);
        byClient.set(clientId, bucket);
      }
      for (const [clientId, bucket] of byClient) {
        const cl = clientById.get(clientId);
        if (!cl) continue;
        const cur = totalsToAgg(sumTotals(bucket.current));
        const prev = totalsToAgg(sumTotals(bucket.previous));
        items.push(
          ...buildItems(`client:${clientId}`, "client", cl.name, slugify(cl.name), null, cur, prev)
        );
      }
    } else {
      const allCur: MetricTotals[] = [];
      const allPrev: MetricTotals[] = [];
      for (const windows of byAccount.values()) {
        allCur.push(windows.current);
        allPrev.push(windows.previous);
      }
      const cur = totalsToAgg(sumTotals(allCur));
      const prev = totalsToAgg(sumTotals(allPrev));
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
