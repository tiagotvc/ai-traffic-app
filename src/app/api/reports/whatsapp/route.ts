import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { buildClientWhatsappSummary } from "@/lib/report-generate";

const BodySchema = z.object({
  clientId: z.string().optional()
});

export async function POST(req: Request) {
  const { tenant, defaultClient } = await getAppContext();
  let body: z.infer<typeof BodySchema> = {};
  try {
    body = BodySchema.parse(await req.json().catch(() => ({})));
  } catch {
    /* empty */
  }

  const client =
    body.clientId != null
      ? await getClientBySlugOrId(tenant.id, body.clientId)
      : defaultClient;
  if (!client) {
    return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
  }

  const text = await buildClientWhatsappSummary({ tenant, client });
  return NextResponse.json({ ok: true, text, clientId: client.id, clientName: client.name });
}
