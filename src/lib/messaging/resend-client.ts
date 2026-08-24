import "server-only";

import { Resend } from "resend";

/**
 * Cliente do Resend para mensagens transacionais de produto (boas-vindas, onboarding…).
 * Deliberadamente separado do `RESEND_API_KEY` já usado em `report-notify.ts` (envio de
 * relatórios ao cliente final) — são integrações distintas com domínios/remetentes
 * próprios; misturar as chaves acopla dois fluxos que evoluem separado.
 */

let client: Resend | null = null;

export function isMessagingResendConfigured(): boolean {
  return Boolean(process.env.MESSAGING_RESEND_API_KEY?.trim());
}

export function getMessagingResend(): Resend | null {
  const apiKey = process.env.MESSAGING_RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}

/** Domínio verificado no Resend para o remetente (`MESSAGING_RESEND_EMAIL_DOMAIN`). */
export function messagingFromAddress(localPart: string, displayName: string): string {
  const domain = process.env.MESSAGING_RESEND_EMAIL_DOMAIN?.trim() || "orionagency.io";
  return `${displayName} <${localPart}@${domain}>`;
}
