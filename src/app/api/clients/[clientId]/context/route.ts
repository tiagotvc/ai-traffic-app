import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";

const BodySchema = z.object({
  aiContext: z.union([z.string(), z.record(z.string(), z.unknown())])
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  const { tenant } = await getAppContext();
  const { client: clientRepo } = await repositories();
  const body = BodySchema.parse(await req.json().catch(() => ({})));

  const client = await getClientBySlugOrId(tenant.id, clientId);
  if (!client) return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });

  if (typeof body.aiContext === "string") {
    try {
      client.aiContext = JSON.parse(body.aiContext);
    } catch {
      client.aiContext = { notes: body.aiContext };
    }
  } else {
    client.aiContext = body.aiContext;
  }

  await clientRepo.save(client);

  return NextResponse.json({ ok: true, aiContext: client.aiContext });
}
