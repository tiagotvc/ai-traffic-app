import "server-only";

import { sendTransactionalEmail } from "@/lib/email";

function billingAdminEmails(): string[] {
  return (process.env.BILLING_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

async function notifyAdmins(subject: string, text: string, tag: string): Promise<void> {
  const recipients = billingAdminEmails();
  if (!recipients.length) return;

  await Promise.all(
    recipients.map((to) =>
      sendTransactionalEmail({ to, subject, text }).catch((err) => {
        // eslint-disable-next-line no-console
        console.error(`[${tag}] falha ao notificar ${to}`, err);
      })
    )
  );
}

function nowInSaoPaulo(): string {
  return new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

/**
 * Alerta de cadastro novo. Dispara uma vez por pessoa, no momento em que a conta nasce,
 * para não ser preciso entrar no painel para saber que alguém chegou.
 *
 * Best-effort de propósito: cadastro não pode falhar porque o e-mail de aviso falhou.
 */
export async function notifyAdminNewSignup(input: {
  email: string;
  name?: string | null;
  method: string;
  utmSource?: string | null;
  utmCampaign?: string | null;
}): Promise<void> {
  const origem = [input.utmSource, input.utmCampaign].filter(Boolean).join(" / ");
  const text = [
    `Alguém acabou de criar uma conta na plataforma.`,
    ``,
    `Nome: ${input.name?.trim() || "não informado"}`,
    `E-mail: ${input.email}`,
    `Cadastro por: ${input.method}`,
    `Origem: ${origem || "direto / não identificada"}`,
    `Quando: ${nowInSaoPaulo()}`,
    ``,
    `A linha da planilha já foi criada com o status "cadastrado" e vai mudar sozinha`,
    `conforme a assinatura andar (trial, assinante, inadimplente, cancelado, suspenso).`
  ].join("\n");

  await notifyAdmins(`[Cadastro] ${input.name?.trim() || input.email}`, text, "signup-alert");
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
  const subject = input.planSlug
    ? `[Funil] Novo visitante no checkout — plano ${input.planSlug}`
    : "[Funil] Novo visitante no checkout";
  const text = [
    `Um visitante novo chegou no checkout pela primeira vez.`,
    ``,
    `Quando: ${nowInSaoPaulo()}`,
    `Plano: ${input.planSlug ?? "não identificado"}`,
    `E-mail: ${input.email ?? "ainda não informado"}`,
    `Visitante: ${input.visitorId}`,
    ``,
    `Painel: /admin/billing/funnel`
  ].join("\n");

  await notifyAdmins(subject, text, "funnel-alerts");
}
