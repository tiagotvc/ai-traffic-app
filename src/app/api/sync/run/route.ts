import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { formatMetaGraphError } from "@/lib/meta-error";
import { enqueueTenantSync } from "@/lib/sync-queue";

const BodySchema = z.object({
  clientId: z.string().optional(),
  adAccountIds: z.array(z.string().uuid()).optional()
});

export async function POST(req: Request) {
  const { tenant, defaultClient, metaAccessToken, user } = await getAppContext();
  const { auditLog: auditRepo } = await repositories();

  if (!metaAccessToken) {
    await auditRepo.save(
      auditRepo.create({
        tenantId: tenant.id,
        clientId: defaultClient.id,
        kind: "SYNC",
        success: false,
        errorMessage: "Missing Meta access token"
      })
    );
    return NextResponse.json(
      { ok: false, error: "Meta não conectada. Reconecte em Configurações." },
      { status: 400 }
    );
  }

  let body: z.infer<typeof BodySchema> = {};
  try {
    const raw = await req.json().catch(() => null);
    if (raw && typeof raw === "object") body = BodySchema.parse(raw);
  } catch {
    /* empty body ok */
  }

  let clientId: string | undefined;
  if (body.clientId) {
    const client = await getClientBySlugOrId(tenant.id, body.clientId);
    if (!client) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
    }
    clientId = client.id;
  }

  try {
    const run = await enqueueTenantSync({
      tenantId: tenant.id,
      defaultClientId: defaultClient.id,
      metaAccessToken,
      manual: true,
      clientId,
      adAccountIds: body.adAccountIds
    });

    await auditRepo.save(
      auditRepo.create({
        tenantId: tenant.id,
        clientId: clientId ?? defaultClient.id,
        kind: "SYNC",
        success: true,
        request: { syncRunId: run.id, accounts: run.accountsTotal, userId: user.id }
      })
    );

    return NextResponse.json({
      ok: true,
      syncRunId: run.id,
      accounts: run.accountsTotal,
      status: run.status
    });
  } catch (err) {
    const msg = formatMetaGraphError(err);
    await auditRepo.save(
      auditRepo.create({
        tenantId: tenant.id,
        clientId: clientId ?? defaultClient.id,
        kind: "SYNC",
        success: false,
        errorMessage: msg
      })
    );
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
