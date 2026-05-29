import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";
import { enqueueTenantSync } from "@/lib/sync-queue";

export async function POST() {
  const { tenant, defaultClient, metaAccessToken } = await getAppContext();
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
      { ok: false, error: "Missing Meta access token. Conecte a Meta em Configurações." },
      { status: 400 }
    );
  }

  try {
    const run = await enqueueTenantSync({
      tenantId: tenant.id,
      defaultClientId: defaultClient.id,
      metaAccessToken,
      manual: true
    });

    await auditRepo.save(
      auditRepo.create({
        tenantId: tenant.id,
        clientId: defaultClient.id,
        kind: "SYNC",
        success: true,
        request: { syncRunId: run.id, accounts: run.accountsTotal }
      })
    );

    return NextResponse.json({
      ok: true,
      syncRunId: run.id,
      accounts: run.accountsTotal,
      status: run.status
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await auditRepo.save(
      auditRepo.create({
        tenantId: tenant.id,
        clientId: defaultClient.id,
        kind: "SYNC",
        success: false,
        errorMessage: msg
      })
    );
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
