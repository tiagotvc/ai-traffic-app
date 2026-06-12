import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { repositories } from "@/db/repositories";
import {
  getAsaasPayment,
  getAsaasPixQr,
  listAsaasPaymentsBySubscription
} from "@/lib/asaas/payments";
import {
  processPaymentConfirmed,
  processPaymentReceived
} from "@/lib/billing/event-handlers";
import type { BillingCycle } from "@/lib/billing/types";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { tenant } = await getAppContext();
  const { invoice: invRepo, subscription: subRepo } = await repositories();
  const inv = await invRepo.findOne({ where: { id, tenantId: tenant.id } });
  if (!inv) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  if (inv.provider === "asaas" && inv.status !== "paid") {
    try {
      let paymentId = inv.externalPaymentId;
      let externalSubscriptionId: string | null = null;

      if (!paymentId) {
        const sub = await subRepo.findOne({ where: { tenantId: tenant.id } });
        if (sub?.externalSubscriptionId) {
          externalSubscriptionId = sub.externalSubscriptionId;
          const payments = await listAsaasPaymentsBySubscription(sub.externalSubscriptionId);
          paymentId = payments.data?.[0]?.id ?? null;
          if (paymentId) {
            inv.externalPaymentId = paymentId;
            await invRepo.save(inv);
          }
        }
      }

      if (paymentId) {
        const payment = await getAsaasPayment(paymentId);
        externalSubscriptionId = payment.subscription ?? externalSubscriptionId;
        const billingCycle = (inv.billingCycle as BillingCycle) ?? "monthly";
        const pollPayload = {
          tenantId: tenant.id,
          invoiceId: inv.id,
          paymentId,
          planId: inv.planId,
          provider: "asaas" as const,
          billingCycle,
          externalCustomerId: payment.customer,
          externalSubscriptionId,
          amountCents: inv.amountCents
        };

        if (payment.status === "RECEIVED") {
          await processPaymentReceived(pollPayload);
        } else if (payment.status === "CONFIRMED") {
          await processPaymentConfirmed(pollPayload);
        }
      } else if (!inv.pixQrCode && inv.billingType === "PIX" && inv.externalPaymentId) {
        const qr = await getAsaasPixQr(inv.externalPaymentId);
        inv.pixQrCode = qr.encodedImage;
        inv.pixCopyPaste = qr.payload;
        inv.pixExpiresAt = new Date(qr.expirationDate);
        await invRepo.save(inv);
      }
    } catch {
      /* ignore poll errors */
    }
    const refreshed = await invRepo.findOne({ where: { id, tenantId: tenant.id } });
    return NextResponse.json({ ok: true, invoice: refreshed ?? inv });
  }

  return NextResponse.json({ ok: true, invoice: inv });
}
