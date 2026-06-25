import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";
import { invalidateClientsListCache } from "@/lib/clients-list";
import { DEMO_CLIENT_NAMES } from "@/lib/demo-data";

/** Gera clientes e métricas demo (30 dias) — só com DEMO_MODE=true. */
export async function POST() {
  if (process.env.DEMO_MODE !== "true") {
    return NextResponse.json(
      { ok: false, error: "Demo desativado. Conecte a Meta e sincronize." },
      { status: 403 }
    );
  }

  const { tenant } = await getAppContext();
  const { client: clientRepo, adAccount: adAccountRepo, metricSnapshot: metricsRepo } =
    await repositories();

  const createdClients: string[] = [];

  for (let i = 0; i < DEMO_CLIENT_NAMES.length; i++) {
    const name = DEMO_CLIENT_NAMES[i];
    let client = await clientRepo.findOne({ where: { tenantId: tenant.id, name } });
    if (!client) {
      client = await clientRepo.save(
        clientRepo.create({
          tenantId: tenant.id,
          name,
          aiContext: { note: "Cliente demo para testes locais." }
        })
      );
      createdClients.push(client.id);
    }

    const metaAdAccountId = `act_demo_${i + 1}`;
    let account = await adAccountRepo.findOne({
      where: { clientId: client.id, metaAdAccountId }
    });
    if (!account) {
      account = await adAccountRepo.save(
        adAccountRepo.create({
          clientId: client.id,
          metaAdAccountId,
          label: `Conta Demo — ${name}`
        })
      );
    }

    const today = new Date();
    for (let d = 29; d >= 0; d--) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      const day = date.toISOString().slice(0, 10);

      const spend = 400 + Math.random() * 600;
      const impressions = Math.floor(20000 + Math.random() * 15000);
      const clicks = Math.floor(impressions * (0.03 + Math.random() * 0.02));
      const conversions = Math.floor(clicks * (0.05 + Math.random() * 0.08));
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const cpc = clicks > 0 ? spend / clicks : 0;
      const roas = 3 + Math.random() * 3;

      const existing = await metricsRepo.findOne({ where: { adAccountId: account.id, day } });
      const payload = {
        adAccountId: account.id,
        day,
        spend: spend.toFixed(2),
        impressions: String(impressions),
        clicks: String(clicks),
        ctr: ctr.toFixed(4),
        cpc: cpc.toFixed(4),
        conversions: String(conversions),
        roas: roas.toFixed(4)
      };

      if (existing) Object.assign(existing, payload);
      await metricsRepo.save(existing ?? metricsRepo.create(payload));
    }
  }

  await invalidateClientsListCache(tenant.id);

  return NextResponse.json({
    ok: true,
    message: `Dados demo gerados para ${DEMO_CLIENT_NAMES.length} clientes (30 dias).`,
    createdClients: createdClients.length
  });
}
