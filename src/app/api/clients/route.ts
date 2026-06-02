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

const CreateClientSchema = z.object({
  name: z.string().min(1).max(120),
  metaBusinessId: z.string().optional(),
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

export async function GET() {
  const { tenant } = await getAppContext();
  const clients = await listClientsForTenant(tenant.id);

  const { adAccount: adAccountRepo, metricSnapshot: metricsRepo, alert: alertRepo } =
    await repositories();

  const clientIds = clients.map((c) => c.id);
  const accounts = clientIds.length
    ? await adAccountRepo.find({ where: { clientId: In(clientIds) } })
    : [];

  const accountIds = accounts.map((a) => a.id);
  const metrics = accountIds.length
    ? await metricsRepo.find({ where: { adAccountId: In(accountIds) } })
    : [];

  const result = await Promise.all(
    clients.map(async (c) => {
      const clientAccounts = accounts.filter((a) => a.clientId === c.id);
      const clientMetrics = metrics.filter((m) =>
        clientAccounts.some((a) => a.id === m.adAccountId)
      );

      let roasSum = 0;
      let roasCount = 0;
      for (const m of clientMetrics) {
        const roas = Number(m.roas);
        if (!Number.isNaN(roas) && roas > 0) {
          roasSum += roas;
          roasCount += 1;
        }
      }

      const openAlerts = await alertRepo.count({
        where: { tenantId: tenant.id, clientId: c.id, dismissed: false }
      });

      return {
        id: c.id,
        slug: slugify(c.name),
        name: c.name,
        roas: roasCount ? roasSum / roasCount : 0,
        accounts: clientAccounts.length,
        alertCount: openAlerts
      };
    })
  );

  return NextResponse.json({ ok: true, clients: result });
}
