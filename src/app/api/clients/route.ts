import { NextResponse } from "next/server";
import { In } from "typeorm";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext, listClientsForTenant, slugify } from "@/lib/app-context";
import {
  applyClientMetaSettings,
  linkAllBmAccountsToClient,
  linkClientMetaAccounts
} from "@/lib/link-client-meta";
import { listTenantPages } from "@/lib/meta-discover";
import { parsePeriodFromSearchParams } from "@/lib/report-period";

// Criar cliente faz descoberta sob demanda da BM (poucas chamadas Meta) — dá folga.
export const maxDuration = 30;

const CreateClientSchema = z.object({
  name: z.string().min(1).max(120),
  metaBusinessId: z.string().optional(),
  metaBusinessName: z.string().optional(),
  metaAdAccountIds: z.array(z.string().min(1)).optional(),
  metaPageId: z.string().optional(),
  metaPixelId: z.string().optional(),
  metaLinkUrl: z.string().max(500).optional(),
  /** Fluxo simplificado: ao vincular a BM, puxa automaticamente todos os ativos dela. */
  linkAllBmAssets: z.boolean().optional()
});

export async function POST(req: Request) {
  const { tenant, metaAccessToken } = await getAppContext();
  const body = CreateClientSchema.parse(await req.json().catch(() => ({})));

  try {
    const { assertLimit } = await import("@/lib/billing/entitlements");
    await assertLimit(tenant.id, "maxClients");
  } catch (err) {
    const { billingErrorResponse } = await import("@/lib/billing/api-errors");
    const res = billingErrorResponse(err);
    if (res) return res;
    throw err;
  }

  const { client: clientRepo, clientGoal: goalRepo } = await repositories();

  const saved = await clientRepo.save(
    clientRepo.create({
      tenantId: tenant.id,
      name: body.name.trim(),
      metaPageId: body.metaPageId?.trim() || null,
      metaLinkUrl: body.metaLinkUrl?.trim() || null,
      metaBusinessId:
        body.metaBusinessId && body.metaBusinessId !== "unassigned"
          ? body.metaBusinessId
          : null
    })
  );

  await goalRepo.save(
    goalRepo.create({ clientId: saved.id, objective: "leads", enabled: false, windowDays: 1 })
  );

  const normalizedBm =
    body.metaBusinessId && body.metaBusinessId !== "unassigned" ? body.metaBusinessId : null;
  const explicitIds = body.metaAdAccountIds ?? [];

  // Fluxo simplificado: BM definida e sem seleção manual de contas → puxa todas as contas da BM.
  const pullAllFromBm = !!normalizedBm && (body.linkAllBmAssets || explicitIds.length === 0);

  let defaultAdAccountId: string | null = null;
  let autoMetaPageId: string | null = null;

  if (pullAllFromBm && normalizedBm) {
    const { linked, accountOptions } = await linkAllBmAccountsToClient({
      tenantId: tenant.id,
      clientId: saved.id,
      metaBusinessId: normalizedBm,
      metaBusinessName: body.metaBusinessName,
      metaAccessToken
    });
    defaultAdAccountId =
      accountOptions[0]?.metaAdAccountId ?? linked[0]?.metaAdAccountId ?? null;

    // Página: se a BM tem exatamente uma, vincula direto; com várias, escolhe na criação do anúncio.
    const bmPages = await listTenantPages(tenant.id, normalizedBm);
    if (bmPages.length === 1) {
      autoMetaPageId = bmPages[0].metaPageId;
    }
  } else if (explicitIds.length > 0) {
    await linkClientMetaAccounts({
      tenantId: tenant.id,
      clientId: saved.id,
      metaAdAccountIds: explicitIds,
      metaAccessToken,
      metaBusinessId: normalizedBm
    });
    defaultAdAccountId = explicitIds[0] ?? null;
  }

  await applyClientMetaSettings({
    client: saved,
    metaPageId: body.metaPageId ?? autoMetaPageId ?? saved.metaPageId,
    metaLinkUrl: body.metaLinkUrl ?? saved.metaLinkUrl,
    metaPixelId: body.metaPixelId ?? null,
    defaultAdAccountId
  });

  return NextResponse.json({
    ok: true,
    client: { id: saved.id, slug: slugify(saved.name), name: saved.name }
  });
}

export async function GET(req: Request) {
  const { tenant } = await getAppContext();
  const url = new URL(req.url);
  const clients = await listClientsForTenant(tenant.id);

  if (url.searchParams.get("minimal") === "1") {
    return NextResponse.json({
      ok: true,
      clients: clients.map((c) => ({
        id: c.id,
        slug: slugify(c.name),
        name: c.name
      }))
    });
  }

  const {
    adAccount: adAccountRepo,
    metricSnapshot: metricsRepo,
    campaignMetricSnapshot: campRepo,
    campaignPreset: presetRepo,
    alert: alertRepo
  } = await repositories();

  // Período opcional (since/until/all) — para que os cards reflitam uma data clara.
  const period = parsePeriodFromSearchParams(url);

  const clientIds = clients.map((c) => c.id);
  const accounts = clientIds.length
    ? await adAccountRepo.find({ where: { clientId: In(clientIds) } })
    : [];

  const accountIds = accounts.map((a) => a.id);
  const accountToClient = new Map(accounts.map((a) => [a.id, a.clientId]));

  const metricsAggRows =
    accountIds.length && !period.allTime && period.since && period.until
      ? await metricsRepo
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
      : [];

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

  const alertCountsRaw = clientIds.length
    ? await alertRepo
        .createQueryBuilder("a")
        .select("a.clientId", "clientId")
        .addSelect("COUNT(*)::int", "cnt")
        .where("a.tenantId = :tenantId", { tenantId: tenant.id })
        .andWhere("a.dismissed = false")
        .andWhere("a.clientId IN (:...clientIds)", { clientIds })
        .groupBy("a.clientId")
        .getRawMany<{ clientId: string; cnt: string }>()
    : [];
  const alertCountByClient = new Map(alertCountsRaw.map((r) => [r.clientId, Number(r.cnt) || 0]));

  // Tipo dominante por cliente (define quais métricas a "prévia da semana" exibe).
  const presetRows = await presetRepo.find({ where: { tenantId: tenant.id } });
  const presetByCampaign = new Map(presetRows.map((r) => [r.metaCampaignId, r.preset]));

  const campaignIdsByClient =
    accountIds.length && !period.allTime && period.since && period.until
      ? await campRepo
          .createQueryBuilder("s")
          .select("s.adAccountId", "adAccountId")
          .addSelect("s.metaCampaignId", "metaCampaignId")
          .where("s.adAccountId IN (:...accountIds)", { accountIds })
          .andWhere("s.day >= :since", { since: period.since })
          .andWhere("s.day <= :until", { until: period.until })
          .groupBy("s.adAccountId")
          .addGroupBy("s.metaCampaignId")
          .getRawMany<{ adAccountId: string; metaCampaignId: string }>()
      : [];

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

  const result = await Promise.all(
    clients.map(async (c) => {
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

      const openAlerts = alertCountByClient.get(c.id) ?? 0;

      return {
        id: c.id,
        slug: slugify(c.name),
        name: c.name,
        roas,
        metrics: metricsAgg,
        dominantPreset: dominantPreset(c.id),
        accounts: clientAccounts.length,
        alertCount: openAlerts
      };
    })
  );

  return NextResponse.json({ ok: true, clients: result });
}
