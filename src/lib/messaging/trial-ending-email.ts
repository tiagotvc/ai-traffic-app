import "server-only";

import { getMessagingResend, isMessagingResendConfigured, messagingFromAddress } from "@/lib/messaging/resend-client";

export type TrialEndingEmailInput = {
  to: string;
  customerName: string;
  appUrl: string;
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function renderHtml(input: TrialEndingEmailInput): string {
  const firstName = escapeHtml(input.customerName.trim().split(/\s+/)[0] || "tudo bem");

  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#0a0f14;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f14;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:480px;background:#111823;border-radius:16px;overflow:hidden;border:1px solid #1f2937;">
            <tr>
              <td style="padding:32px 32px 8px;">
                <p style="margin:0;color:#f59e0b;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Orion Agency</p>
                <h1 style="margin:12px 0 0;color:#f8fafc;font-size:22px;line-height:1.3;">${firstName}, seu período gratuito termina hoje</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 8px;">
                <p style="margin:0 0 16px;color:#cbd5e1;font-size:14px;line-height:1.6;">
                  Depois de hoje, o acesso à sua conta fica suspenso até você escolher um plano.
                  Assine agora pra não perder o que já configurou — clientes, contas de anúncio e
                  regras conectadas continuam exatamente como estão.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                <a href="${escapeHtml(input.appUrl)}"
                   style="display:inline-block;background:#f59e0b;color:#0a0f14;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px;">
                  Ver planos
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;border-top:1px solid #1f2937;">
                <p style="margin:16px 0 0;color:#64748b;font-size:11px;line-height:1.6;">
                  Dúvidas? Responda este e-mail — a equipe Orion está de olho.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderText(input: TrialEndingEmailInput): string {
  return (
    `Seu período gratuito no Orion Agency termina hoje.\n\n` +
    `Depois de hoje, o acesso à sua conta fica suspenso até você escolher um plano. ` +
    `Assine agora pra não perder o que já configurou.\n\n` +
    `Ver planos: ${input.appUrl}\n\n` +
    `Dúvidas? Responda este e-mail.`
  );
}

/**
 * Único e-mail do ciclo de trial (por decisão de produto: nada no dia 3, só no último dia,
 * pra não consumir a cota mensal do Resend à toa). Best-effort — nunca lança.
 */
export async function sendTrialEndingEmail(
  input: TrialEndingEmailInput
): Promise<{ sent: boolean; error?: string }> {
  if (!isMessagingResendConfigured()) {
    return { sent: false, error: "MESSAGING_RESEND_API_KEY não configurada" };
  }
  const resend = getMessagingResend();
  if (!resend) return { sent: false, error: "cliente Resend indisponível" };

  try {
    const { error } = await resend.emails.send({
      from: messagingFromAddress("contas", "Orion Agency"),
      to: [input.to],
      subject: "Seu período gratuito no Orion termina hoje",
      html: renderHtml(input),
      text: renderText(input)
    });
    if (error) return { sent: false, error: error.message ?? String(error) };
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : "erro desconhecido" };
  }
}
