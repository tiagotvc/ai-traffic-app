import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { formatMetaGraphError } from "@/lib/meta-error";
import { getMetaConnectionInfo } from "@/lib/meta-auth-store";
import { enqueueTenantSync } from "@/lib/sync-queue";

const BodySchema = z.object({
  clientId: z.string().optional(),
  adAccountIds: z.array(z.string().uuid()).optional(),
  auto: z.boolean().optional()
});

export async function POST(req: Request) {
  const { tenant, defaultClient, metaAccessToken, user } = await getAppContext();
  const { auditLog: auditRepo } = await repositories();

  const metaConnection = await getMetaConnectionInfo(tenant.id, user.id);

  if (!metaAccessToken) {
    const noMetaMsg =
      metaConnection.hintCode === "member_no_workspace_meta"
        ? "O administrador do workspace ainda não conectou a Meta. Peça para ele entrar em Configurações e conectar o Facebook."
        : "Meta não conectada. Reconecte em Configurações.";
    await auditRepo.save(
      auditRepo.create({
        tenantId: tenant.id,
        clientId: defaultClient.id,
        kind: "SYNC",
        success: false,
        errorMessage: noMetaMsg
      })
    );
    return NextResponse.json({ ok: false, error: noMetaMsg, metaConnection }, { status: 400 });
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
      manual: !body.auto,
      clientId,
      adAccountIds: body.adAccountIds,
      triggeredByUserId: user.id
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
