import "server-only";

import { emailTextToHtml, renderBrandedEmail } from "@/lib/messaging/branded-email";
import { getMessagingResend, isMessagingResendConfigured, messagingFromAddress } from "@/lib/messaging/resend-client";

export type LifecycleEmailInput = {
  to: string;
  subject: string;
  title: string;
  text: string;
  eyebrow: string;
  actionLabel: string;
  actionUrl: string;
};

export async function sendLifecycleEmail(
  input: LifecycleEmailInput
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
      subject: input.subject,
      text: `${input.title}\n\n${input.text}\n\n${input.actionLabel}: ${input.actionUrl}`,
      html: renderBrandedEmail({
        preheader: input.subject,
        eyebrow: input.eyebrow,
        title: input.title,
        bodyHtml: emailTextToHtml(input.text),
        action: { label: input.actionLabel, href: input.actionUrl }
      })
    });
    if (error) return { sent: false, error: error.message ?? String(error) };
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : "erro desconhecido" };
  }
}
