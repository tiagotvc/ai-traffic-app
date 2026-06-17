import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { buildClientReportPdf } from "@/lib/report-generate";
import { sendReportEmail } from "@/lib/report-notify";

const BodySchema = z.object({
  clientId: z.string().optional(),
  days: z.number().min(1).max(90).optional(),
  template: z.enum(["performance", "executive"]).optional(),
  email: z.string().email().optional()
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

  const days = body.template === "executive" ? 30 : (body.days ?? 7);
  const bytes = await buildClientReportPdf({ tenant, client, days });
  const safeName = client.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  if (body.email) {
    const mail = await sendReportEmail({
      to: body.email,
      subject: `Relatório ${client.name} — ${tenant.brandName ?? tenant.name}`,
      text: `Segue em anexo o relatório de performance (${days} dias) de ${client.name}.`,
      pdfBytes: bytes,
      filename: `relatorio-${safeName}.pdf`
    });
    if (!mail.sent) {
      return NextResponse.json({ ok: false, error: mail.error ?? "Falha no envio" }, { status: 502 });
    }
    return NextResponse.json({ ok: true, emailed: true, to: body.email });
  }

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="relatorio-${safeName}.pdf"`
    }
  });
}
