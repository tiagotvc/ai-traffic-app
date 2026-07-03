import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import { rejectExecution } from "@/lib/engine/executor";

const BodySchema = z.object({ reason: z.string().max(500).optional() });

/** Rejeita uma pendência da fila do Engine: nada é executado na Meta. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { tenant, user } = await getAppContext();
  const body = BodySchema.parse(await req.json().catch(() => ({})));

  const outcome = await rejectExecution({
    tenantId: tenant.id,
    executionId: id,
    userId: user.id,
    reason: body.reason ?? null
  });
  if (!outcome.ok) {
    return NextResponse.json(
      { ok: false, error: outcome.error },
      { status: outcome.code === "not_found" ? 404 : 409 }
    );
  }

  return NextResponse.json({ ok: true, action: outcome.execution });
}
