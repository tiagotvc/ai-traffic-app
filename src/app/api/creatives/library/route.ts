import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext, slugify } from "@/lib/app-context";

export async function GET() {
  const { tenant } = await getAppContext();
  const { creativeAsset: repo, client: clientRepo } = await repositories();

  const clients = await clientRepo.find({ where: { tenantId: tenant.id } });
  const clientMap = new Map(clients.map((c) => [c.id, c]));

  const assets = await repo.find({ order: { createdAt: "DESC" }, take: 500 });
  const rows = assets
    .filter((a) => clientMap.has(a.clientId))
    .map((a) => {
      const client = clientMap.get(a.clientId)!;
      return {
        id: a.id,
        title: a.label,
        description: a.label,
        type: "image" as const,
        format: "Imagem",
        clientName: client.name,
        clientSlug: slugify(client.name),
        campaignName: "—",
        status: "active" as const,
        performance: "medium" as const,
        metricLabel: "—",
        usageAds: 0,
        usageCampaigns: 0,
        createdAt: a.createdAt.toISOString()
      };
    });

  return NextResponse.json({ ok: true, rows, total: rows.length });
}
