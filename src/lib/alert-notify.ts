import "server-only";

import type { Alert } from "@/db/entities/Alert";
import type { Client } from "@/db/entities/Client";

export async function notifyCriticalAlert(input: {
  alert: Alert;
  client?: Client | null;
  tenantName: string;
  webhookAlertUrl?: string | null;
}) {
  const lines = [
    `[Orion Agency] Alerta crítico — ${input.tenantName}`,
    `Cliente: ${input.client?.name ?? "—"}`,
    `${input.alert.title}`,
    input.alert.description
  ];

  const text = lines.join("\n");

  const webhook = input.webhookAlertUrl?.trim() || process.env.ALERT_WEBHOOK_URL?.trim();
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, alertId: input.alert.id, severity: input.alert.severity })
      });
    } catch {
      /* ignore webhook errors */
    }
  }

  const emailTo = process.env.ALERT_EMAIL_TO?.trim();
  if (emailTo && process.env.RESEND_API_KEY) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: process.env.ALERT_EMAIL_FROM ?? "alerts@traffic-ai.local",
          to: [emailTo],
          subject: `[Orion Agency] ${input.alert.title}`,
          text
        })
      });
    } catch {
      /* ignore */
    }
  }
}
