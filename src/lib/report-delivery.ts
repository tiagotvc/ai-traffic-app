import "server-only";

import type { Client } from "@/db/entities/Client";
import type { ReportSchedule } from "@/db/entities/ReportSchedule";
import type { Tenant } from "@/db/entities/Tenant";
import { slugify } from "@/lib/app-context";
import { isPlatformFeatureEnabled } from "@/lib/feature-flags/service";
import type { PeriodPreset } from "@/lib/report-period";
import { buildClientReportPdf, buildClientWhatsappSummary } from "@/lib/report-generate";
import { sendReportEmail } from "@/lib/report-notify";
import { createReportPrintToken } from "@/lib/report-print-token";

/** Entrega de relatório agendado ao cliente (v3). Cada canal atrás de flag. */
export type DeliveryResult = {
  channel: string;
  ok: boolean;
  skipped?: boolean;
  reason?: string;
};

const SHARE_TTL_MS = 90 * 24 * 60 * 60 * 1000; // link estável por 90 dias

const CHANNEL_FLAG: Record<string, string> = {
  email_pdf: "reports.v3.emailPdf",
  email_link: "reports.v3.emailLink",
  whatsapp: "reports.v3.whatsapp"
};

function appBaseUrl(): string {
  return (
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    ""
  );
}

function reportLink(tenant: Tenant, client: Client, schedule: ReportSchedule): string {
  const token = createReportPrintToken(
    {
      tenantId: tenant.id,
      clientParam: slugify(client.name),
      reportType: schedule.reportType === "complete" ? "complete" : "simple",
      locale: "pt-BR",
      goalLabel: "Conversões",
      preset: (schedule.periodPreset ?? "last30") as PeriodPreset
    },
    SHARE_TTL_MS
  );
  return `${appBaseUrl()}/pt-BR/report-print?pdfToken=${encodeURIComponent(token)}`;
}

export async function deliverScheduledReport(
  schedule: ReportSchedule,
  tenant: Tenant,
  client: Client
): Promise<DeliveryResult> {
  const channel = schedule.deliveryChannel || "email_pdf";
  const flagId = CHANNEL_FLAG[channel] ?? "reports.v3.emailPdf";
  if (!(await isPlatformFeatureEnabled(flagId))) {
    return { channel, ok: false, skipped: true, reason: "channel_disabled" };
  }

  const brand = tenant.brandName ?? tenant.name;

  if (channel === "whatsapp") {
    const phone = schedule.recipientPhone?.trim();
    const token = process.env.WHATSAPP_TOKEN?.trim();
    const phoneId = process.env.WHATSAPP_PHONE_ID?.trim();
    if (!phone || !token || !phoneId) {
      return { channel, ok: false, skipped: true, reason: "whatsapp_not_configured" };
    }
    const summary = await buildClientWhatsappSummary({ tenant, client });
    const link = reportLink(tenant, client, schedule);
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: `${summary}\n\nRelatório completo: ${link}` }
      })
    });
    return { channel, ok: res.ok, reason: res.ok ? undefined : `http_${res.status}` };
  }

  const to = schedule.recipients[0];
  if (!to) return { channel, ok: false, skipped: true, reason: "no_recipient" };

  if (channel === "email_link") {
    const link = reportLink(tenant, client, schedule);
    await sendReportEmail({
      to,
      subject: `Relatório ${client.name} — ${brand}`,
      text: `O relatório de ${client.name} está pronto.\n\nAbra quando quiser: ${link}`
    });
    return { channel, ok: true };
  }

  // email_pdf (default)
  const bytes = await buildClientReportPdf({ tenant, client });
  const safe = client.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  await sendReportEmail({
    to,
    subject: `Relatório ${client.name} — ${brand}`,
    text: `Relatório automático de ${client.name}.`,
    pdfBytes: bytes,
    filename: `relatorio-${safe}.pdf`
  });
  return { channel, ok: true };
}
