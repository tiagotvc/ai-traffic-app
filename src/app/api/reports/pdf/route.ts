import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { resolveRanges } from "@/lib/dashboard-ranges";
import { buildReportPreview } from "@/lib/report-preview-data";
import { buildReportPdfFromPreview } from "@/lib/report-generate";
import type { MetricKey } from "@/lib/dashboard-metrics";
import { parsePeriodFromSearchParams } from "@/lib/report-period";
import { sendReportEmail } from "@/lib/report-notify";

const BodySchema = z.object({
  clientId: z.string().min(1),
  adAccountId: z.string().optional(),
  reportType: z.enum(["simple", "complete"]).default("simple"),
  locale: z.string().default("pt-BR"),
  goalLabel: z.string().optional(),
  email: z.string().email().optional(),
  since: z.string().optional(),
  until: z.string().optional(),
  preset: z.string().optional(),
  selectedMetrics: z.array(z.string()).optional()
});

async function resolvePeriodRanges(body: z.infer<typeof BodySchema>) {
  if (body.since && body.until) {
    const len = Math.round((Date.parse(body.until) - Date.parse(body.since)) / 86_400_000) + 1;
    const { addDaysIso } = await import("@/lib/report-period");
    const prevUntil = addDaysIso(body.since, -1);
    const prevSince = addDaysIso(prevUntil, -(len - 1));
    return {
      current: { since: body.since, until: body.until },
      previous: { since: prevSince, until: prevUntil }
    };
  }

  const preset =
    body.preset === "last30" ? "last30" : body.preset === "thisWeek" ? "thisWeek" : "last7";
  const resolved = resolveRanges({ preset, since: "", until: "" });
  return { current: resolved.current, previous: resolved.previous };
}

export async function POST(req: Request) {
  const { tenant } = await getAppContext();
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json().catch(() => ({})));
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const client = await getClientBySlugOrId(tenant.id, body.clientId);
  if (!client) {
    return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
  }

  const { current, previous } = await resolvePeriodRanges(body);
  if (!current || !previous) {
    return NextResponse.json({ ok: false, error: "invalid_period" }, { status: 400 });
  }
  const preview = await buildReportPreview({
    tenantId: tenant.id,
    clientParam: body.clientId,
    adAccountId: body.adAccountId ?? null,
    current,
    previous,
    locale: body.locale,
    reportType: body.reportType,
    goalLabel: body.goalLabel ?? "Conversões"
  });

  if (!preview.ok) {
    return NextResponse.json(preview, { status: preview.error === "client_not_found" ? 404 : 400 });
  }

  const bytes = await buildReportPdfFromPreview({
    tenant,
    payload: preview,
    reportType: body.reportType,
    locale: body.locale,
    selectedMetrics: body.selectedMetrics as MetricKey[] | undefined
  });

  const safeName = client.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  if (body.email) {
    const mail = await sendReportEmail({
      to: body.email,
      subject: `Relatório ${client.name} — ${tenant.brandName ?? tenant.name}`,
      text: `Segue em anexo o relatório de ${client.name} (${preview.period.currentLabel}).`,
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
