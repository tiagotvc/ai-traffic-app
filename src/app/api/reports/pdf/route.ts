import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { buildClientReportPdf } from "@/lib/report-generate";

const BodySchema = z.object({
  clientId: z.string().optional(),
  days: z.number().min(1).max(90).optional()
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

  const bytes = await buildClientReportPdf({ tenant, client, days: body.days });
  const safeName = client.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="relatorio-${safeName}.pdf"`
    }
  });
}
