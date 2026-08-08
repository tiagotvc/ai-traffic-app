/**
 * Consentimento de cookies (LGPD/GDPR). Use `hasAnalyticsConsent()` antes de
 * carregar qualquer script de rastreio (Meta Pixel, Google Analytics, etc.).
 *
 * Exemplo:
 *   if (hasAnalyticsConsent()) loadMetaPixel();
 *   window.addEventListener(COOKIE_CONSENT_EVENT, () => {
 *     if (hasAnalyticsConsent()) loadMetaPixel();
 *   });
 */
export const COOKIE_CONSENT_KEY = "orion-cookie-consent";
export const COOKIE_CONSENT_EVENT = "orion:cookie-consent";

/**
 * Cookie primeiro-parte espelhando a escolha do localStorage. Existe só porque o
 * servidor não enxerga localStorage — e o envio server-side ao Meta (Conversions
 * API) precisa checar consentimento antes de mandar qualquer coisa.
 * Leitura no servidor: [[src/lib/server-consent.ts]].
 */
export const COOKIE_CONSENT_COOKIE = "orion_consent";

export type CookieConsent = "accepted" | "rejected";

/** Escolha atual do usuário, ou null se ainda não decidiu. */
export function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    return v === "accepted" || v === "rejected" ? v : null;
  } catch {
    return null;
  }
}

/** True somente se o usuário aceitou cookies de análise/rastreio. */
export function hasAnalyticsConsent(): boolean {
  return getCookieConsent() === "accepted";
}

/** Espelha a escolha num cookie primeiro-parte pro servidor conseguir ler. */
function writeConsentCookie(value: CookieConsent): void {
  if (typeof document === "undefined") return;
  const oneYear = 60 * 60 * 24 * 365;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_CONSENT_COOKIE}=${value}; Path=/; Max-Age=${oneYear}; SameSite=Lax${secure}`;
}

/** Escolha atual segundo o cookie (o que o servidor enxerga). */
export function getConsentCookie(): CookieConsent | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_CONSENT_COOKIE}=([^;]*)`));
  const v = match?.[1];
  return v === "accepted" || v === "rejected" ? v : null;
}

/**
 * Regrava o cookie pra quem já tinha decidido antes dele existir — sem isso, quem
 * aceitou no passado ficaria sem rastreio server-side até decidir de novo (e o
 * banner não reaparece, porque o localStorage já está preenchido).
 */
export function syncConsentCookieFromStorage(): void {
  const stored = getCookieConsent();
  if (stored && getConsentCookie() !== stored) writeConsentCookie(stored);
}

/** Grava a escolha e notifica listeners (mesmo aba) via evento `COOKIE_CONSENT_EVENT`. */
export function setCookieConsent(value: CookieConsent): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, value);
    window.localStorage.setItem(`${COOKIE_CONSENT_KEY}-at`, String(Date.now()));
    writeConsentCookie(value);
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: value }));
  } catch {
    /* ignore */
  }
}
