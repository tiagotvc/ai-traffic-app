import { NextResponse } from "next/server";

import { getBillingProvider } from "@/lib/billing/providers";
import { ingestWebhookEvent } from "@/lib/billing/webhook-ingest";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const provider = getBillingProvider("stripe");
    const event = await provider.parseWebhook(req);
    const result = await ingestWebhookEvent(event);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[webhooks/stripe]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Webhook error" },
      { status: 400 }
    );
  }
}
