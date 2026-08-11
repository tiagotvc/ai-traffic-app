"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { trackEvent } from "@/lib/analytics";
import { COOKIE_CONSENT_EVENT, hasAnalyticsConsent } from "@/lib/cookie-consent";

/**
 * Dispara conversões que chegam por query param no redirect (server actions e
 * callbacks de OAuth não conseguem chamar o tracker do navegador):
 *
 *   • `?signup=1`         → sign_up            — vindo de registerWithCredentials
 *   • `?metaConnected=1`  → connect_ad_account — vindo de /api/meta/oauth/callback
 *
 * Só GA4: os eventos da Meta saem pelo servidor (Conversions API), que é mais
 * confiável e já tem o e-mail pra correspondência — ver [[src/lib/analytics/signup-events.ts]].
 *
 * A trava de `sessionStorage` só é gravada DEPOIS de conseguir disparar. Antes ela
 * era gravada de cara, então quem ainda não tinha aceitado cookies perdia a
 * conversão de vez; agora o evento fica esperando o aceite (ouvindo
 * COOKIE_CONSENT_EVENT) e dispara assim que ele vier.
 */
function ConversionBeaconInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams) return;

    const fireOnce = (key: string, fn: () => void) => {
      if (!hasAnalyticsConsent()) return; // sem aceite ainda — tenta de novo depois
      try {
        if (sessionStorage.getItem(key)) return;
      } catch {
        /* modo privado — dispara mesmo assim, no pior caso uma duplicata rara */
      }
      fn();
      try {
        sessionStorage.setItem(key, "1");
      } catch {
        /* idem */
      }
    };

    const run = () => {
      if (searchParams.get("signup") === "1") {
        fireOnce("conv:sign_up", () => trackEvent("sign_up", { method: "credentials" }));
      }
      if (searchParams.get("metaConnected") === "1") {
        fireOnce("conv:connect_ad_account", () =>
          trackEvent("connect_ad_account", { provider: "meta" })
        );
      }
    };

    run();
    window.addEventListener(COOKIE_CONSENT_EVENT, run);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, run);
  }, [pathname, searchParams]);

  return null;
}

export function ConversionBeacon() {
  return (
    <Suspense fallback={null}>
      <ConversionBeaconInner />
    </Suspense>
  );
}
