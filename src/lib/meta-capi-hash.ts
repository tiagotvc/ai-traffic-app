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
  if (raw.phone) out.ph = [sha256(raw.phone.replace(/\D/g, ""))];
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
