import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext, resolveClientIdForTenant } from "@/lib/app-context";
import { getMetaConnectionInfo } from "@/lib/meta-auth-store";
import { enqueueHistoricalBackfill } from "@/lib/historical-backfill";

const BodySchema = z.object({
  depthDays: z.coerce.number().int().min(1).max(365).optional(),
  clientId: z.string().optional()
});

export async function POST(req: Request) {
  const { tenant, metaAccessToken, user } = await getAppContext();

  const metaConnection = await getMetaConnectionInfo(tenant.id, user.id);
  if (!metaAccessToken) {
    return NextResponse.json(
      { ok: false, error: metaConnection.hintCode === "member_no_workspace_meta" ? "Meta ainda não conectada." : "Reconecte a Meta." },
      { status: 400 }
    );
  }

  let body: z.infer<typeof BodySchema> = {};
  try {
    const raw = await req.json().catch(() => null);
    if (raw && typeof raw === "object") body = BodySchema.parse(raw);
  } catch {
    /* ignore */
  }

  const depthDays = (body.depthDays ?? 90) as number;
  const clientId =
    body.clientId != null
      ? await resolveClientIdForTenant(tenant.id, body.clientId)
      : await resolveClientIdForTenant(tenant.id);
  if (!clientId) {
    return NextResponse.json(
      { ok: false, error: "Cadastre um cliente antes de executar o backfill." },
      { status: 400 }
    );
  }

  const result = await enqueueHistoricalBackfill({
    tenantId: tenant.id,
    metaAccessToken,
    depthDays: depthDays as any,
    clientId,
    triggeredByUserId: user.id
  });

  if (result.ok === false) {
    return NextResponse.json({ ok: false, error: (result as any).error ?? "Failed" }, { status: 400 });
  }

  if (result.skipped) {
    return NextResponse.json({ ok: true, skipped: true, message: "Backfill recente — pulando." });
  }

  return NextResponse.json({ ok: true, runId: result.runId });
}

