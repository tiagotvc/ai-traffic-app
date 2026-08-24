import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";

const PatchSchema = z.object({ observationMode: z.boolean() });

/** Modo observação do Cortex: automação só observa e recomenda — nunca executa. */
export async function PATCH(req: Request) {
  const { tenant } = await getAppContext();
  const body = PatchSchema.parse(await req.json().catch(() => ({})));

  const { tenant: tenantRepo } = await repositories();
  await tenantRepo.update({ id: tenant.id }, { automationObservationMode: body.observationMode });

  return NextResponse.json({ ok: true, observationMode: body.observationMode });
}
