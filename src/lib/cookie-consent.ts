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

/** Grava a escolha e notifica listeners (mesmo aba) via evento `COOKIE_CONSENT_EVENT`. */
export function setCookieConsent(value: CookieConsent): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, value);
    window.localStorage.setItem(`${COOKIE_CONSENT_KEY}-at`, String(Date.now()));
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: value }));
  } catch {
    /* ignore */
  }
}
