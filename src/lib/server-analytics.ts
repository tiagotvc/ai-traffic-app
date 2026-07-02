import "server-only";

import crypto from "node:crypto";

/**
 * Server-side conversion tracking for the *confirmed* purchase.
 *
 * Why server-side: the browser rarely sees a synchronous "payment approved"
 * (PIX is paid later on the bank app, cards go through async processing, and
 * subscription *renewals* happen with no browser at all). So the single source
 * of truth for a real sale is the gateway webhook → [[src/lib/billing/event-handlers.ts]]
 * `processPaymentReceived`, which is gateway-agnostic (Asaas **and** Stripe funnel
 * through it). From there we fire:
 *
 *   • Meta Conversions API  → `Purchase`   (graph.facebook.com /events)
 *   • GA4 Measurement Protocol → `purchase` (google-analytics.com /mp/collect)
 *
 * Both are best-effort and never throw into the billing flow. PII (email/phone)
 * is SHA-256 hashed before it leaves this server — raw values never go to Meta.
 *
 * This complements the browser funnel in [[src/lib/analytics.ts]]; a stable
 * `event_id`/`transaction_id` (the invoice/payment id) dedups against any browser
 * Pixel event and against duplicate webhook deliveries.
 */

const META_API_VERSION = "v19.0";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

/** GA4 Measurement Protocol wants a `client_id` shaped like `1234567890.1234567890`. */
function pseudoClientId(seed: string): string {
  const digest = crypto.createHash("sha256").update(seed).digest("hex");
  const a = parseInt(digest.slice(0, 10), 16) % 1_000_000_000;
  const b = parseInt(digest.slice(10, 20), 16) % 1_000_000_000;
  return `${a}.${b}`;
}

export type ServerPurchaseInput = {
  /** Unique id for this sale — the invoice id (or payment id). Dedups Meta + webhook retries. */
  transactionId: string;
  /** Amount actually charged, in cents. */
  valueCents: number;
  /** ISO currency, e.g. "BRL" | "USD". */
  currency: string;
  planId?: string;
  planName?: string;
  billingCycle?: "monthly" | "yearly";
  provider?: "asaas" | "stripe";
  /** true = first paid subscription; false = renewal/upgrade. */
  isNewCustomer?: boolean;
  /** Stable per-user id so GA4 stitches the sale to the logged-in user. */
  tenantId?: string;
  /** Hashed before sending to Meta; improves match quality. Optional. */
  userData?: { email?: string; phone?: string };
  /** Meta browser cookies captured at checkout, if available (better attribution). */
  fbp?: string;
  fbc?: string;
};

async function sendMetaPurchase(input: ServerPurchaseInput): Promise<void> {
  const pixelId = process.env.META_PIXEL_ID?.trim();
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN?.trim();
  if (!pixelId || !accessToken) return; // not configured → skip quietly

  const userData: Record<string, unknown> = {};
  if (input.userData?.email) userData.em = [sha256(input.userData.email)];
  if (input.userData?.phone) userData.ph = [sha256(input.userData.phone.replace(/\D/g, ""))];
  if (input.fbp) userData.fbp = input.fbp;
  if (input.fbc) userData.fbc = input.fbc;

  const payload = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: `purchase_${input.transactionId}`,
        action_source: "website",
        user_data: userData,
        custom_data: {
          value: Number((input.valueCents / 100).toFixed(2)),
          currency: input.currency,
          content_type: "product",
          content_name: input.planName ?? input.planId ?? "Orion subscription",
          order_id: input.transactionId
        }
      }
    ]
  };

  const res = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }
  );
  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(`meta_capi_purchase: ${json?.error?.message ?? res.status}`);
  }
}

async function sendGa4Purchase(input: ServerPurchaseInput): Promise<void> {
  const measurementId = process.env.GA4_MEASUREMENT_ID?.trim();
  const apiSecret = process.env.GA4_API_SECRET?.trim();
  if (!measurementId || !apiSecret) return; // not configured → skip quietly

  const body = {
    client_id: pseudoClientId(input.tenantId ?? input.transactionId),
    ...(input.tenantId ? { user_id: input.tenantId } : {}),
    non_personalized_ads: false,
    events: [
      {
        name: "purchase",
        params: {
          transaction_id: input.transactionId,
          value: Number((input.valueCents / 100).toFixed(2)),
          currency: input.currency,
          billing_cycle: input.billingCycle,
          new_customer: input.isNewCustomer ?? null,
          payment_provider: input.provider,
          items: [
            {
              item_id: input.planId ?? "orion_plan",
              item_name: input.planName ?? input.planId ?? "Orion subscription",
              price: Number((input.valueCents / 100).toFixed(2)),
              quantity: 1
            }
          ]
        }
      }
    ]
  };

  const res = await fetch(
    `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }
  );
  // GA4 MP returns 204 with no body on success; anything else is a soft failure.
  if (!res.ok) throw new Error(`ga4_mp_purchase: ${res.status}`);
}

/**
 * Fire the confirmed `Purchase` to Meta CAPI + GA4 MP. Best-effort: each channel
 * is independent and failures are swallowed (logged) so tracking never breaks
 * billing. Skips silently if the value is zero or a channel is unconfigured.
 */
export async function trackServerPurchase(input: ServerPurchaseInput): Promise<void> {
  if (!input.transactionId || !(input.valueCents > 0) || !input.currency) return;

  const results = await Promise.allSettled([sendMetaPurchase(input), sendGa4Purchase(input)]);
  for (const r of results) {
    if (r.status === "rejected") {
      console.error("[server-analytics] purchase tracking failed:", r.reason);
    }
  }
}
