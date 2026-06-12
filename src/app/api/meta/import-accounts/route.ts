import { NextResponse } from "next/server";
import { In } from "typeorm";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";
import { linkClientMetaAccounts } from "@/lib/link-client-meta";
import { listMetaAdAccountOptions } from "@/lib/meta-ad-accounts";

export const maxDuration = 60;

const BodySchema = z.object({
  metaAdAccountIds: z.array(z.string().min(1)).min(1)
});

export async function POST(req: Request) {
  const { tenant, metaAccessToken } = await getAppContext();
  const body = BodySchema.parse(await req.json().catch(() => ({})));

  // Opções válidas para o tenant (valida contra contas reais da Meta / inventário).
  const options = await listMetaAdAccountOptions({
    tenantId: tenant.id,
    metaAccessToken,
    hideDemoWhenRealExists: true
  });
  const optById = new Map(options.map((o) => [o.metaAdAccountId, o]));

  const { client: clientRepo, clientGoal: goalRepo, adAccount: adAccountRepo } = await repositories();

  // Contas já vinculadas no tenant (não duplicar / aditivo).
  const clients = await clientRepo.find({ where: { tenantId: tenant.id } });
  const clientIds = clients.map((c) => c.id);
  const linked = clientIds.length
    ? await adAccountRepo.find({ where: { clientId: In(clientIds) } })
    : [];
  const linkedSet = new Set(linked.map((a) => a.metaAdAccountId));

  let created = 0;
  let skipped = 0;

  for (const id of body.metaAdAccountIds) {
    const opt = optById.get(id);
    if (!opt || linkedSet.has(id)) {
      skipped += 1;
      continue;
    }

    const client = await clientRepo.save(
      clientRepo.create({
        tenantId: tenant.id,
        name: opt.label,
        metaBusinessId: opt.metaBusinessId ?? null
      })
    );
    await goalRepo.save(
      goalRepo.create({ clientId: client.id, objective: "leads", enabled: false, windowDays: 1 })
    );
    await linkClientMetaAccounts({
      tenantId: tenant.id,
      clientId: client.id,
      metaAdAccountIds: [id],
      metaAccessToken,
      metaBusinessId: opt.metaBusinessId ?? null
    });
    linkedSet.add(id);
    created += 1;
  }

  return NextResponse.json({ ok: true, created, skipped });
}
