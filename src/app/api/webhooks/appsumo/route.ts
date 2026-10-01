import { NextResponse } from "next/server";

import { verifyAppsumoSignature } from "@/lib/billing/appsumo/verify";
import { handleAppsumoWebhookEvent, type AppsumoWebhookPayload } from "@/lib/billing/appsumo/webhook-handler";

export const maxDuration = 30;

export async function POST(req: Request) {
  const rawBody = await req.text();
  let payload: AppsumoWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // Test pings from the Partner Portal validation step aren't guaranteed to carry a signature
  // yet (the HMAC secret is the product's own API key, issued once the URL validates) — real
  // events always are, and handleAppsumoWebhookEvent never touches data for test===true anyway.
  if (!payload.test) {
    const signature = req.headers.get("x-appsumo-signature");
    const timestamp = req.headers.get("x-appsumo-timestamp");
    if (!signature || !timestamp) {
      return NextResponse.json({ ok: false, error: "Missing signature headers" }, { status: 401 });
    }
    try {
      verifyAppsumoSignature(rawBody, timestamp, signature);
    } catch (err) {
      console.error("[webhooks/appsumo] signature verification failed", err);
      return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
    }
  }

  try {
    const result = await handleAppsumoWebhookEvent(payload);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[webhooks/appsumo]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Webhook error" },
      { status: 500 }
    );
  }
}
