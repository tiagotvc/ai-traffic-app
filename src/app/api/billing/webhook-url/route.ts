import { NextResponse } from "next/server";

import { getAsaasWebhookUrl } from "@/lib/app-url";
import { isAsaasConfigured } from "@/lib/asaas/client";

/** URL pública do webhook Asaas (para configurar no painel). */
export async function GET() {
  return NextResponse.json({
    ok: true,
    webhookUrl: getAsaasWebhookUrl(),
    asaasConfigured: isAsaasConfigured(),
    events: ["PAYMENT_CREATED", "PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]
  });
}
