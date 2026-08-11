import "server-only";

import { sendTransactionalEmail } from "@/lib/email";

function billingAdminEmails(): string[] {
  return (process.env.BILLING_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

/**
 * Alerta best-effort pro admin — dispara só na primeira vez que um visitante chega no
 * checkout (checado por quem chama, `src/lib/funnel/record-event.ts`), não a cada clique.
 */
export async function notifyAdminNewCheckoutVisitor(input: {
  visitorId: string;
  planSlug?: string | null;
  email?: string | null;
}): Promise<void> {
  const recipients = billingAdminEmails();
  if (!recipients.length) return;

  const when = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const subject = input.planSlug
    ? `[Funil] Novo visitante no checkout — plano ${input.planSlug}`
    : "[Funil] Novo visitante no checkout";
  const text = [
    `Um visitante novo chegou no checkout pela primeira vez.`,
    ``,
    `Quando: ${when}`,
    `Plano: ${input.planSlug ?? "não identificado"}`,
    `E-mail: ${input.email ?? "ainda não informado"}`,
    `Visitante: ${input.visitorId}`,
    ``,
    `Painel: /admin/billing/funnel`
  ].join("\n");

  await Promise.all(
    recipients.map((to) =>
      sendTransactionalEmail({ to, subject, text }).catch((err) => {
        // eslint-disable-next-line no-console
        console.error(`[funnel-alerts] falha ao notificar ${to}`, err);
      })
    )
  );
}
