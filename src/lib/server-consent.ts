import "server-only";

import { cookies } from "next/headers";

import { COOKIE_CONSENT_COOKIE } from "@/lib/cookie-consent";

/**
 * Consentimento de rastreio visto pelo servidor (LGPD).
 *
 * O banner grava a escolha no localStorage E num cookie primeiro-parte
 * ([[src/lib/cookie-consent.ts]]); só o cookie chega até aqui. Todo envio ao Meta
 * feito no servidor precisa passar por `hasServerAnalyticsConsent()` antes.
 *
 * Importante: quem ainda não decidiu conta como NÃO consentido — o padrão é não
 * rastrear, nunca o contrário.
 */
export async function hasServerAnalyticsConsent(): Promise<boolean> {
  try {
    const store = await cookies();
    return store.get(COOKIE_CONSENT_COOKIE)?.value === "accepted";
  } catch {
    // Fora de um contexto de request (cron, worker de fila) não há como saber —
    // trata como não consentido.
    return false;
  }
}

/**
 * Cookies do Pixel do Meta (`_fbp`/`_fbc`), quando existem. Melhoram bastante a
 * correspondência na Conversions API. Só existem se o Pixel carregou, o que já
 * pressupõe consentimento — mesmo assim quem chama deve checar antes.
 */
export async function readMetaBrowserCookies(): Promise<{ fbp?: string; fbc?: string }> {
  try {
    const store = await cookies();
    const fbp = store.get("_fbp")?.value?.trim();
    const fbc = store.get("_fbc")?.value?.trim();
    return { ...(fbp ? { fbp } : {}), ...(fbc ? { fbc } : {}) };
  } catch {
    return {};
  }
}
