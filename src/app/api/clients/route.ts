import { NextResponse } from "next/server";
import { Between, In } from "typeorm";
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
  const clients = await listClientsForTenant(tenant.id);

  const { adAccount: adAccountRepo, metricSnapshot: metricsRepo, alert: alertRepo } =
    await repositories();

  // Período opcional (since/until/all) — para que os cards reflitam uma data clara.
  const period = parsePeriodFromSearchParams(new URL(req.url));

  const clientIds = clients.map((c) => c.id);
  const accounts = clientIds.length
    ? await adAccountRepo.find({ where: { clientId: In(clientIds) } })
    : [];

  const accountIds = accounts.map((a) => a.id);
  const dayFilter =
    !period.allTime && period.since && period.until
      ? { day: Between(period.since, period.until) }
      : {};
  const metrics = accountIds.length
    ? await metricsRepo.find({ where: { adAccountId: In(accountIds), ...dayFilter } })
    : [];

  const result = await Promise.all(
    clients.map(async (c) => {
      const clientAccounts = accounts.filter((a) => a.clientId === c.id);
      const clientMetrics = metrics.filter((m) =>
        clientAccounts.some((a) => a.id === m.adAccountId)
      );

      let spend = 0;
      let impressions = 0;
      let clicks = 0;
      let conversions = 0;
      let reach = 0;
      let messages = 0;
      let roasSum = 0;
      let roasCount = 0;
      for (const m of clientMetrics) {
        spend += Number(m.spend) || 0;
        impressions += Number(m.impressions) || 0;
        clicks += Number(m.clicks) || 0;
        conversions += Number(m.conversions) || 0;
        reach += Number(m.reach) || 0;
        messages += Number(m.messages) || 0;
        const roas = Number(m.roas);
        if (!Number.isNaN(roas) && roas > 0) {
          roasSum += roas;
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
        frequency: reach > 0 ? impressions / reach : 0,
        roas
      };

      const openAlerts = await alertRepo.count({
        where: { tenantId: tenant.id, clientId: c.id, dismissed: false }
      });

      return {
        id: c.id,
        slug: slugify(c.name),
        name: c.name,
        roas,
        metrics: metricsAgg,
        accounts: clientAccounts.length,
        alertCount: openAlerts
      };
    })
  );

  return NextResponse.json({ ok: true, clients: result });
}
