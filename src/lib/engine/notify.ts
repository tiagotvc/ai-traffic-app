import "server-only";

/**
 * Canais de notificação do Orion Engine (ações `notify_whatsapp` / `notify_slack`).
 * WhatsApp reusa a mesma Cloud API dos relatórios v3 (`WHATSAPP_TOKEN` +
 * `WHATSAPP_PHONE_ID`); Slack é incoming webhook informado na própria regra.
 */

export async function sendWhatsappText(phone: string, text: string): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN?.trim();
  const phoneId = process.env.WHATSAPP_PHONE_ID?.trim();
  if (!token || !phoneId) {
    throw new Error("WhatsApp não configurado (WHATSAPP_TOKEN / WHATSAPP_PHONE_ID)");
  }
  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: { body: text }
    })
  });
  if (!res.ok) throw new Error(`WhatsApp Cloud API: HTTP ${res.status}`);
}

export async function sendSlackWebhook(webhookUrl: string, text: string): Promise<void> {
  if (!/^https:\/\/hooks\.slack\.com\//.test(webhookUrl)) {
    throw new Error("URL de webhook Slack inválida (esperado https://hooks.slack.com/…)");
  }
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text })
  });
  if (!res.ok) throw new Error(`Slack webhook: HTTP ${res.status}`);
}
