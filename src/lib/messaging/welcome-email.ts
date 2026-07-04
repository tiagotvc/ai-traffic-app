import "server-only";

import { getMessagingResend, isMessagingResendConfigured, messagingFromAddress } from "@/lib/messaging/resend-client";

export type WelcomeEmailInput = {
  to: string;
  customerName: string;
  planName: string;
  billingCycle: "monthly" | "yearly";
  appUrl: string;
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function renderHtml(input: WelcomeEmailInput): string {
  const firstName = escapeHtml(input.customerName.trim().split(/\s+/)[0] || "tudo bem");
  const planName = escapeHtml(input.planName);
  const cycleLabel = input.billingCycle === "yearly" ? "anual" : "mensal";

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
                <h1 style="margin:12px 0 0;color:#f8fafc;font-size:22px;line-height:1.3;">Bem-vindo(a), ${firstName}! 🎉</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 8px;">
                <p style="margin:0 0 16px;color:#cbd5e1;font-size:14px;line-height:1.6;">
                  Sua assinatura do plano <strong style="color:#f8fafc;">${planName}</strong> (${cycleLabel}) foi confirmada
                  e já está ativa. A partir de agora o Orion está observando suas campanhas, aprendendo com os dados
                  e pronto para recomendar as próximas otimizações.
                </p>
                <p style="margin:0 0 24px;color:#cbd5e1;font-size:14px;line-height:1.6;">
                  Se você acabou de conectar uma conta Meta, a primeira análise dos últimos 90 dias já está rodando
                  em segundo plano — as recomendações aparecem assim que ela terminar.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                <a href="${escapeHtml(input.appUrl)}"
                   style="display:inline-block;background:#f59e0b;color:#0a0f14;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px;">
                  Acessar o Orion
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

function renderText(input: WelcomeEmailInput): string {
  const cycleLabel = input.billingCycle === "yearly" ? "anual" : "mensal";
  return (
    `Bem-vindo(a) ao Orion Agency!\n\n` +
    `Sua assinatura do plano ${input.planName} (${cycleLabel}) foi confirmada e já está ativa.\n\n` +
    `Acesse: ${input.appUrl}\n\n` +
    `Dúvidas? Responda este e-mail.`
  );
}

/**
 * E-mail de boas-vindas disparado na PRIMEIRA ativação de assinatura paga (nunca em
 * renovação — ver gate `isNewCustomer` em `event-handlers.ts`). Best-effort: nunca
 * lança — billing não pode falhar por causa de e-mail transacional.
 */
export async function sendWelcomeEmail(input: WelcomeEmailInput): Promise<{ sent: boolean; error?: string }> {
  if (!isMessagingResendConfigured()) {
    return { sent: false, error: "MESSAGING_RESEND_API_KEY não configurada" };
  }
  const resend = getMessagingResend();
  if (!resend) return { sent: false, error: "cliente Resend indisponível" };

  try {
    const { error } = await resend.emails.send({
      from: messagingFromAddress("bemvindo", "Orion Agency"),
      to: [input.to],
      subject: `Bem-vindo(a) ao Orion — plano ${input.planName} ativado`,
      html: renderHtml(input),
      text: renderText(input)
    });
    if (error) return { sent: false, error: error.message ?? String(error) };
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : "erro desconhecido" };
  }
}
