import "server-only";

import { createHash } from "crypto";

/**
 * Hashing de PII para a Conversions API da Meta. A Meta **exige** SHA-256 de
 * e-mail/telefone/nome/etc. normalizados (requisito, não diferencial).
 */

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
function norm(value: string): string {
  return value.trim().toLowerCase();
}

/** Código de país assumido quando o número vem só com DDD (base da Orion é BR). */
const DEFAULT_PHONE_COUNTRY = "55";

/**
 * A Meta espera o telefone em E.164 **sem** o `+`, ou seja: código do país + DDD +
 * número. Só tirar os não-dígitos não basta — `(11) 99999-9999` virava `11999999999`,
 * que nunca casava com o `5511999999999` cadastrado na Meta. Na prática isso zerava a
 * correspondência por telefone de toda a base brasileira.
 *
 * Heurística pelo tamanho, porque não guardamos o país do telefone:
 *   • 10 dígitos → fixo com DDD    → prefixa 55
 *   • 11 dígitos → celular com DDD → prefixa 55
 *   • 12+        → já tem código de país → passa direto
 *
 * Limitação conhecida: um número estrangeiro de 10 dígitos (EUA, por exemplo) recebe
 * 55 indevidamente. Só afeta a correspondência daquele evento — não quebra o envio.
 * Se a base internacional crescer, passe o país explicitamente em vez do palpite.
 */
function normPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10 || digits.length === 11) return `${DEFAULT_PHONE_COUNTRY}${digits}`;
  return digits;
}

export type CapiUserDataRaw = {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string; // ISO-2 (ex.: "br")
  externalId?: string;
  // Campos enviados em claro (a Meta NÃO quer hash nestes):
  clientIpAddress?: string;
  clientUserAgent?: string;
  fbc?: string;
  fbp?: string;
};

/** Normaliza + hasheia conforme a especificação da Meta. */
export function hashUserData(raw: CapiUserDataRaw): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (raw.email) out.em = [sha256(norm(raw.email))];
  if (raw.phone) {
    const phone = normPhone(raw.phone);
    if (phone) out.ph = [sha256(phone)];
  }
  if (raw.firstName) out.fn = [sha256(norm(raw.firstName))];
  if (raw.lastName) out.ln = [sha256(norm(raw.lastName))];
  if (raw.city) out.ct = [sha256(norm(raw.city).replace(/\s/g, ""))];
  if (raw.state) out.st = [sha256(norm(raw.state))];
  if (raw.zip) out.zp = [sha256(norm(raw.zip))];
  if (raw.country) out.country = [sha256(norm(raw.country))];
  if (raw.externalId) out.external_id = [sha256(norm(raw.externalId))];
  if (raw.clientIpAddress) out.client_ip_address = raw.clientIpAddress;
  if (raw.clientUserAgent) out.client_user_agent = raw.clientUserAgent;
  if (raw.fbc) out.fbc = raw.fbc;
  if (raw.fbp) out.fbp = raw.fbp;
  return out;
}
