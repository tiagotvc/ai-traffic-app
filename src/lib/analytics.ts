/**
 * Analytics helpers — GTM dataLayer (GA4 lives *inside* GTM) + Meta Conversions API.
 *
 * Consent-first: every client call short-circuits when `hasAnalyticsConsent()` is
 * false, so nothing is tracked until the user accepts in the existing
 * CookieConsentBanner (see [[src/lib/cookie-consent.ts]]).
 *
 * Architecture: GTM is the single container. GA4 and the Meta Pixel are configured
 * as tags *in the GTM web panel* — this file just pushes events to `window.dataLayer`
 * so those tags can fire. Meta conversions ALSO go server-side via the Conversions
 * API ([[src/app/api/track/meta/route.ts]]), sharing one `event_id` for dedup.
 */
import { hasAnalyticsConsent } from "@/lib/cookie-consent";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/** Meta standard events we currently use on the site. */
export type MetaEventName =
  | "Lead"
  | "CompleteRegistration"
  | "Contact"
  | "ViewContent"
  | "InitiateCheckout"
  | "Subscribe"
  | "StartTrial";

/** Push a raw object to the GTM dataLayer. No-op on the server or without consent. */
export function pushDataLayer(event: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  if (!hasAnalyticsConsent()) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(event);
}

/**
 * Generic GA4 event (via GTM). Configure a matching GA4 Event tag in GTM listening
 * to the custom event name. Example: trackEvent("cta_click", { cta: "hero_signup" }).
 */
export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  pushDataLayer({ event: name, ...params });
}

/** SPA page view. In GTM, fire a GA4 Event tag `page_view` on this custom event. */
export function trackPageView(pagePath: string): void {
  if (typeof window === "undefined") return;
  pushDataLayer({
    event: "page_view",
    page_path: pagePath,
    page_location: window.location.href,
    page_title: document.title
  });
}

/** Dedup id shared between the browser Pixel (GTM) and the server Conversions API. */
function newEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Fire a Meta standard event on BOTH the browser Pixel (via dataLayer → GTM) and the
 * server Conversions API, sharing one `event_id` so Meta deduplicates them.
 *
 * userData (email/phone) is only sent to our server, which hashes it (SHA-256) before
 * forwarding — raw PII never reaches Meta from the browser.
 */
export async function trackMetaEvent(
  name: MetaEventName,
  opts: {
    customData?: Record<string, unknown>;
    userData?: { email?: string; phone?: string };
  } = {}
): Promise<void> {
  if (typeof window === "undefined") return;
  if (!hasAnalyticsConsent()) return;

  const eventId = newEventId();

  // 1) Browser — push so the GTM Meta Pixel tag fires with this event_id (for dedup).
  pushDataLayer({
    event: "meta_event",
    meta_event_name: name,
    meta_event_id: eventId,
    ...opts.customData
  });

  // 2) Server — Conversions API. Best-effort: never block UX on tracking.
  try {
    await fetch("/api/track/meta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        eventName: name,
        eventId,
        eventSourceUrl: window.location.href,
        customData: opts.customData ?? {},
        userData: opts.userData ?? {}
      })
    });
  } catch {
    /* CAPI is best-effort — the browser Pixel already covered the event. */
  }
}
