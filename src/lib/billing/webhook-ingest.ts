import "server-only";

import { repositories } from "@/db/repositories";
import { enqueueBillingJob, recordBillingEvent } from "./jobs";
import {
  resolveTenantFromAsaasPayment,
  resolveTenantFromStripeCustomer
} from "./billing-service";
import type { WebhookEvent } from "./providers/types";

export async function ingestWebhookEvent(event: WebhookEvent) {
  const { event: row, isNew } = await recordBillingEvent({
    provider: event.provider,
    eventType: event.eventType,
    idempotencyKey: event.idempotencyKey,
    tenantId: event.tenantId,
    payload: event.payload
  });
  if (!isNew) return { duplicate: true, eventId: row.id };

  const jobPayload = await buildJobPayload(event);
  if (!jobPayload) return { duplicate: false, eventId: row.id, skipped: true };

  const jobType = mapEventToJobType(event.eventType, event.provider);
  if (jobType) {
    await enqueueBillingJob(jobType, { ...jobPayload, asaasEvent: event.eventType });
  }

  return { duplicate: false, eventId: row.id, jobType };
}

function mapEventToJobType(eventType: string, provider: string): string | null {
  const t = eventType.toUpperCase();

  if (provider === "asaas") {
    if (t === "PAYMENT_CREATED") return "payment_created";
    if (t === "PAYMENT_CONFIRMED") return "payment_confirmed";
    if (t === "PAYMENT_RECEIVED") return "payment_received";
    if (t.includes("OVERDUE")) return "payment_overdue";
    if (t.includes("SUBSCRIPTION_DELETED") || t.includes("SUBSCRIPTION_CANCELED")) {
      return "subscription_canceled";
    }
    return null;
  }

  if (
    t.includes("PAYMENT_RECEIVED") ||
    t.includes("PAYMENT_CONFIRMED") ||
    t === "INVOICE.PAID" ||
    t === "CHECKOUT.SESSION.COMPLETED"
  ) {
    return "payment_received";
  }
  if (t.includes("OVERDUE") || t === "INVOICE.PAYMENT_FAILED") {
    return "payment_overdue";
  }
  if (t.includes("SUBSCRIPTION_DELETED") || t === "CUSTOMER.SUBSCRIPTION.DELETED") {
    return "subscription_canceled";
  }
  return null;
}

async function buildJobPayload(event: WebhookEvent): Promise<Record<string, unknown> | null> {
  const p = event.payload;

  if (event.provider === "asaas") {
    const payment = p.payment as Record<string, unknown> | undefined;
    if (!payment) return null;
    const customerId = payment.customer as string;
    const tenantId = customerId ? await resolveTenantFromAsaasPayment(customerId) : null;
    const { invoice: invRepo } = await repositories();
    const inv = payment.id
      ? await invRepo.findOne({ where: { externalPaymentId: payment.id as string } })
      : null;
    return {
      tenantId: tenantId ?? inv?.tenantId,
      invoiceId: inv?.id,
      paymentId: payment.id,
      planId: inv?.planId,
      billingCycle: inv?.billingCycle ?? "monthly",
      provider: "asaas",
      amountCents: Math.round(Number(payment.value ?? 0) * 100),
      externalCustomerId: customerId,
      externalSubscriptionId: payment.subscription ?? null,
      paymentStatus: payment.status ?? null
    };
  }

  if (event.provider === "stripe") {
    const obj = p;
    const customerId = (obj.customer as string) ?? null;
    const tenantId = customerId ? await resolveTenantFromStripeCustomer(customerId) : null;
    const metadata = (obj.metadata as Record<string, string>) ?? {};
    const { plan: planRepo } = await repositories();
    const fallbackPlan = metadata.planId
      ? await planRepo.findOne({ where: { id: metadata.planId } })
      : null;
    return {
      tenantId: metadata.tenantId ?? tenantId,
      planId: metadata.planId ?? fallbackPlan?.id,
      provider: "stripe",
      externalCustomerId: customerId,
      externalSubscriptionId: (obj.subscription as string) ?? (obj.id as string),
      billingCycle: metadata.billingCycle ?? "monthly",
      amountCents: obj.amount_total ? Number(obj.amount_total) : undefined,
      paymentId: obj.payment_intent as string | undefined
    };
  }

  return null;
}
