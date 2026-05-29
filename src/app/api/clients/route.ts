import { NextResponse } from "next/server";
import { In } from "typeorm";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext, listClientsForTenant, slugify } from "@/lib/app-context";

const CreateClientSchema = z.object({
  name: z.string().min(1).max(120)
});

export async function POST(req: Request) {
  const { tenant } = await getAppContext();
  const body = CreateClientSchema.parse(await req.json().catch(() => ({})));
  const { client: clientRepo, clientGoal: goalRepo } = await repositories();

  const saved = await clientRepo.save(
    clientRepo.create({ tenantId: tenant.id, name: body.name.trim() })
  );

  await goalRepo.save(
    goalRepo.create({ clientId: saved.id, objective: "leads", enabled: false, windowDays: 1 })
  );

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
