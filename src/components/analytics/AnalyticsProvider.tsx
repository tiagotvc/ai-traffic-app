"use client";

import { Suspense, useEffect, useState } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";

import { COOKIE_CONSENT_EVENT, getCookieConsent } from "@/lib/cookie-consent";
import { trackPageView } from "@/lib/analytics";
import { ConversionBeacon } from "@/components/analytics/ConversionBeacon";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

/** Fires a page_view on every SPA route change (Suspense-wrapped for useSearchParams). */
function PageViewTracker({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!enabled) return;
    const qs = searchParams?.toString();
    trackPageView(qs ? `${pathname}?${qs}` : pathname);
  }, [enabled, pathname, searchParams]);

  return null;
}

/**
 * Loads Google Tag Manager only after the user accepts analytics cookies, and
 * tracks SPA page views. GA4 + Meta Pixel are configured as tags inside GTM;
 * this component only injects the container and pushes page_view events.
 *
 * Gated by the existing consent system ([[src/lib/cookie-consent.ts]]): if the
 * user rejects (or hasn't decided), GTM never loads → zero tracking.
 */
export function AnalyticsProvider() {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    const sync = () => setConsented(getCookieConsent() === "accepted");
    sync(); // initial (handles returning visitors who already accepted)
    window.addEventListener(COOKIE_CONSENT_EVENT, sync);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, sync);
  }, []);

  if (!GTM_ID) return null;

  return (
    <>
      {consented ? (
        <Script id="gtm-init" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>
      ) : null}
      <Suspense fallback={null}>
        <PageViewTracker enabled={consented} />
      </Suspense>
      <ConversionBeacon />
    </>
  );
}
