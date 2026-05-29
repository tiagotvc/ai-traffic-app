import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext, slugify } from "@/lib/app-context";

export async function GET(req: Request) {
  const { tenant } = await getAppContext();
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? "50");

  const { alert: alertRepo, client: clientRepo } = await repositories();
  const alerts = await alertRepo.find({
    where: { tenantId: tenant.id, dismissed: false },
    order: { createdAt: "DESC" },
    take: limit
  });

  const clients = await clientRepo.find({ where: { tenantId: tenant.id } });
  const clientMap = new Map(clients.map((c) => [c.id, c]));

  return NextResponse.json({
    ok: true,
    alerts: alerts.map((a) => {
      const c = a.clientId ? clientMap.get(a.clientId) : null;
      return {
        id: a.id,
        type: a.type,
        severity: a.severity,
        title: a.title,
        message: a.description,
        clientId: a.clientId,
        clientName: c?.name ?? null,
        clientSlug: c ? slugify(c.name) : null,
        metaCampaignId: a.metaCampaignId,
        createdAt: a.createdAt.toISOString()
      };
    })
  });
}
