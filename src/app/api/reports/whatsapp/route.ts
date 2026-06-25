import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext, getClientBySlugOrId, resolveClientIdForTenant } from "@/lib/app-context";
import { buildClientWhatsappSummary } from "@/lib/report-generate";

const BodySchema = z.object({
  clientId: z.string().optional()
});

export async function POST(req: Request) {
  const { tenant } = await getAppContext();
  let body: z.infer<typeof BodySchema> = {};
  try {
    body = BodySchema.parse(await req.json().catch(() => ({})));
  } catch {
    /* empty */
  }

  const clientId =
    body.clientId != null
      ? await resolveClientIdForTenant(tenant.id, body.clientId)
      : await resolveClientIdForTenant(tenant.id);
  if (!clientId) {
    return NextResponse.json(
      { ok: false, error: "Cliente não encontrado. Cadastre um cliente primeiro." },
      { status: 404 }
    );
  }
  const client = await getClientBySlugOrId(tenant.id, clientId);
  if (!client) {
    return NextResponse.json(
      { ok: false, error: "Cliente não encontrado. Cadastre um cliente primeiro." },
      { status: 404 }
    );
  }

  const text = await buildClientWhatsappSummary({ tenant, client });
  return NextResponse.json({ ok: true, text, clientId: client.id, clientName: client.name });
}
