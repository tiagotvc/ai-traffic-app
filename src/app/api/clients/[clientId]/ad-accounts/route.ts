import { NextResponse } from "next/server";
import { In } from "typeorm";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { listTenantBusinessesWithCounts } from "@/lib/meta-discover";
import { listMetaAdAccountOptions } from "@/lib/meta-ad-accounts";

const BodySchema = z.object({
  metaAdAccountIds: z.array(z.string().min(1))
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  const { tenant, metaAccessToken } = await getAppContext();
  const client = await getClientBySlugOrId(tenant.id, clientId);
  if (!client) return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });

  const available = await listMetaAdAccountOptions({
    tenantId: tenant.id,
    metaAccessToken,
    hideDemoWhenRealExists: true
  });
  const { adAccount: adAccountRepo } = await repositories();
  const linked = await adAccountRepo.find({ where: { clientId: client.id } });
  const linkedIds = new Set(linked.map((a) => a.metaAdAccountId));

  const businesses = await listTenantBusinessesWithCounts(tenant.id);

  return NextResponse.json({
    ok: true,
    available,
    businesses,
    linked: linked.map((a) => ({
      id: a.id,
      metaAdAccountId: a.metaAdAccountId,
      label: a.label ?? a.metaAdAccountId
    })),
    linkedMetaIds: [...linkedIds]
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  const { tenant, metaAccessToken } = await getAppContext();
  const client = await getClientBySlugOrId(tenant.id, clientId);
  if (!client) return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });

  const body = BodySchema.parse(await req.json().catch(() => ({})));
  const { adAccount: adAccountRepo } = await repositories();

  const available = await listMetaAdAccountOptions({
    tenantId: tenant.id,
    metaAccessToken,
    hideDemoWhenRealExists: true
  });
  const availableMap = new Map(available.map((a) => [a.metaAdAccountId, a]));
  const inventoryMeta = new Map(
    available.map((a) => [a.metaAdAccountId, a.metaBusinessId ?? null])
  );

  const allClients = await repositories().then((r) =>
    r.client.find({ where: { tenantId: tenant.id } })
  );
  const otherClientIds = allClients.filter((c) => c.id !== client.id).map((c) => c.id);

  const others =
    otherClientIds.length > 0
      ? await adAccountRepo.find({ where: { clientId: In(otherClientIds) } })
      : [];

  const current = await adAccountRepo.find({ where: { clientId: client.id } });
  const want = new Set(body.metaAdAccountIds.filter((id) => availableMap.has(id)));

  for (const row of current) {
    if (!want.has(row.metaAdAccountId)) {
      await adAccountRepo.remove(row);
    }
  }

  const currentIds = new Set(
    (await adAccountRepo.find({ where: { clientId: client.id } })).map((a) => a.metaAdAccountId)
  );

  for (const metaId of want) {
    if (currentIds.has(metaId)) continue;

    const onOther = others.find((a) => a.metaAdAccountId === metaId);
    if (onOther) {
      onOther.clientId = client.id;
      onOther.metaBusinessId = inventoryMeta.get(metaId) ?? onOther.metaBusinessId;
      await adAccountRepo.save(onOther);
    } else {
      await adAccountRepo.save(
        adAccountRepo.create({
          clientId: client.id,
          metaAdAccountId: metaId,
          metaBusinessId: inventoryMeta.get(metaId) ?? null,
          label: availableMap.get(metaId)?.label ?? null
        })
      );
    }
  }

  const linked = await adAccountRepo.find({ where: { clientId: client.id } });
  return NextResponse.json({
    ok: true,
    linked: linked.map((a) => ({
      id: a.id,
      metaAdAccountId: a.metaAdAccountId,
      label: a.label ?? a.metaAdAccountId
    }))
  });
}
