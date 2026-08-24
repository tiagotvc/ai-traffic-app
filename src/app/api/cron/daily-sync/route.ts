import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getTenantMetaAccessToken } from "@/lib/meta-auth-store";
import { enqueueTenantSync } from "@/lib/sync-queue";

export const maxDuration = 300;

function authorizeCron(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

/**
 * Sync diário automático (fluxo do warehouse, pedido 2026-07-04): mantém os snapshots
 * atualizados todo dia mesmo sem sync manual — o export horário empurra o delta para
 * `orion_raw.meta_campaign_insights` e o brain-pipeline gera recomendações no fim de
 * cada sync. Gated por plano (`allowAutoSync`): tenants sem o recurso são pulados.
 */
export async function POST(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { tenant: tenantRepo, client: clientRepo } = await repositories();
  const tenants = await tenantRepo.find();

  let synced = 0;
  let skipped = 0;
  for (const tenant of tenants) {
    try {
      const token = await getTenantMetaAccessToken(tenant.id);
      if (!token) {
        skipped++;
        continue;
      }
      const firstClient = await clientRepo.findOne({
        where: { tenantId: tenant.id },
        order: { createdAt: "ASC" }
      });
      if (!firstClient) {
        skipped++;
        continue;
      }
      await enqueueTenantSync({
        tenantId: tenant.id,
        defaultClientId: firstClient.id,
        metaAccessToken: token,
        manual: false
      });
      synced++;
    } catch {
      // plano sem allowAutoSync, cooldown ou falha pontual — segue para o próximo
      skipped++;
    }
  }

  return NextResponse.json({ ok: true, synced, skipped, tenants: tenants.length });
}

/** Vercel Cron chama via GET. */
export async function GET(req: Request) {
  return POST(req);
}
