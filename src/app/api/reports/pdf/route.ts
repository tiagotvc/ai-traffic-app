import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import type { MetricKey } from "@/lib/dashboard-metrics";
import { buildReportPdfFromPreview } from "@/lib/report-generate";
import { renderReportPdfWithPuppeteer } from "@/lib/report-pdf-puppeteer";
import { buildReportPreview } from "@/lib/report-preview-data";
import { resolveReportPeriodRanges } from "@/lib/report-print-data";
import type { PeriodPreset } from "@/lib/report-period";
import { sendReportEmail } from "@/lib/report-notify";

export const maxDuration = 90;

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
  period: z.string().optional(),
  selectedMetrics: z.array(z.string()).optional()
});

function resolvePreset(body: z.infer<typeof BodySchema>): PeriodPreset {
  const raw = (body.period ?? body.preset ?? "thisWeek").trim() as PeriodPreset;
  const allowed: PeriodPreset[] = [
    "today",
    "yesterday",
    "thisWeek",
    "thisMonth",
    "thisQuarter",
    "last7",
    "last14",
    "last15",
    "last30",
    "custom"
  ];
  return allowed.includes(raw) ? raw : "thisWeek";
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

  const preset = resolvePreset(body);
  const { current, previous } = await resolveReportPeriodRanges({
    preset,
    since: body.since,
    until: body.until
  });
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

  let bytes: Uint8Array;
  try {
    bytes = await renderReportPdfWithPuppeteer({
      tenantId: tenant.id,
      clientParam: body.clientId,
      adAccountId: body.adAccountId ?? null,
      reportType: body.reportType,
      locale: body.locale,
      goalLabel: body.goalLabel ?? "Conversões",
      preset,
      since: body.since,
      until: body.until,
      selectedMetrics: body.selectedMetrics as MetricKey[] | undefined
    });
  } catch (error) {
    console.error("[reports/pdf] Puppeteer failed, using pdf-lib fallback:", error);
    bytes = await buildReportPdfFromPreview({
      tenant,
      payload: preview,
      reportType: body.reportType,
      locale: body.locale,
      selectedMetrics: body.selectedMetrics as MetricKey[] | undefined
    });
  }

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
