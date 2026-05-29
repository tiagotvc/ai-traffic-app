import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { linkClientMetaAccounts } from "@/lib/link-client-meta";
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

  const linked = await linkClientMetaAccounts({
    tenantId: tenant.id,
    clientId: client.id,
    metaAdAccountIds: body.metaAdAccountIds,
    metaAccessToken
  });

  return NextResponse.json({
    ok: true,
    linked: linked.map((a) => ({
      id: a.id,
      metaAdAccountId: a.metaAdAccountId,
      label: a.label ?? a.metaAdAccountId
    }))
  });
}
