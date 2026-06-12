import { NextResponse } from "next/server";

import { getBillingProvider } from "@/lib/billing/providers";
import { processBillingJobs } from "@/lib/billing/jobs";
import { ingestWebhookEvent } from "@/lib/billing/webhook-ingest";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const provider = getBillingProvider("asaas");
    const event = await provider.parseWebhook(req);
    const result = await ingestWebhookEvent(event);
    const processed = await processBillingJobs(5);
    return NextResponse.json({ ok: true, ...result, worker: processed });
  } catch (err) {
    console.error("[webhooks/asaas]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Webhook error" },
      { status: 400 }
    );
  }
}
