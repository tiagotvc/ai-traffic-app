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
  if (!isNew) {
    console.log(`[billing-webhook] duplicate provider=${event.provider} type=${event.eventType} eventId=${row.id}`);
    return { duplicate: true, eventId: row.id };
  }

  const jobPayload = await buildJobPayload(event);
  if (!jobPayload) {
    console.warn(
      `[billing-webhook] no payload resolved (tenant/invoice not found?) provider=${event.provider} type=${event.eventType} eventId=${row.id}`
    );
    return { duplicate: false, eventId: row.id, skipped: true };
  }

  const jobType = mapEventToJobType(event.eventType, event.provider);
  if (jobType) {
    await enqueueBillingJob(jobType, { ...jobPayload, asaasEvent: event.eventType });
  } else {
    console.warn(
      `[billing-webhook] UNMAPPED event type, no job enqueued provider=${event.provider} type=${event.eventType} eventId=${row.id}`
    );
  }

  return { duplicate: false, eventId: row.id, jobType };
}

function mapEventToJobType(eventType: string, provider: string): string | null {
  const t = eventType.toUpperCase();

  if (provider === "asaas") {
    if (t === "PAYMENT_CREATED") return "payment_created";
    if (t === "PAYMENT_CONFIRMED") return "payment_confirmed";
    if (t === "PAYMENT_RECEIVED") return "payment_received";
    // Reprovação de risco / recusa de captura têm o mesmo efeito prático que um atraso: aplica
    // carência em vez de derrubar a assinatura na hora.
    if (t === "PAYMENT_REPROVED_BY_RISK_ANALYSIS" || t === "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED") {
      return "payment_overdue";
    }
    if (t.includes("OVERDUE")) return "payment_overdue";
    if (t === "PAYMENT_REFUNDED" || t === "PAYMENT_PARTIALLY_REFUNDED") return "payment_refunded";
    if (t === "PAYMENT_CHARGEBACK_REQUESTED") return "payment_chargeback";
    if (t === "SUBSCRIPTION_INACTIVATED") return "subscription_inactivated";
    if (t.includes("SUBSCRIPTION_DELETED") || t.includes("SUBSCRIPTION_CANCELED")) {
      return "subscription_canceled";
    }
    if (t === "INVOICE_AUTHORIZED") return "nf_authorized";
    if (t === "INVOICE_ERROR") return "nf_error";

    // Pix Automático — autorização de recorrência (não confundir com Assinaturas/subscription).
    if (t === "PIX_AUTOMATIC_RECURRING_AUTHORIZATION_ACTIVATED") return "pix_auth_activated";
    if (t === "PIX_AUTOMATIC_RECURRING_AUTHORIZATION_CANCELLED") return "pix_auth_cancelled";
    if (t === "PIX_AUTOMATIC_RECURRING_AUTHORIZATION_EXPIRED") return "pix_auth_expired";
    if (t === "PIX_AUTOMATIC_RECURRING_AUTHORIZATION_REFUSED") return "pix_auth_refused";
    // Instrução de pagamento recusada pelo banco tem o mesmo efeito de um atraso normal.
    if (t === "PIX_AUTOMATIC_RECURRING_PAYMENT_INSTRUCTION_REFUSED") return "payment_overdue";
    // AUTHORIZATION_CREATED (já sabemos, fomos nós que criamos), INSTRUCTION_CREATED/SCHEDULED/
    // CANCELLED (informativo — o motor recorrente já sabe o que criou) e ELIGIBILITY_UPDATED não
    // mudam estado — ficam só como log.

    // Demais eventos (SUBSCRIPTION_UPDATED, PAYMENT_UPDATED, split, boleto visualizado, disputa em
    // andamento, etc.) não mudam estado — ficam só como log via recordBillingEvent (já registrado
    // antes desta função ser chamada).
    return null;
  }

  if (
    t.includes("PAYMENT_RECEIVED") ||
    t.includes("PAYMENT_CONFIRMED") ||
    t === "INVOICE.PAID" ||
    t === "INVOICE.PAYMENT_SUCCEEDED" ||
    t === "CHECKOUT.SESSION.COMPLETED" ||
    // Métodos de pagamento assíncronos (ex: alguns redirects bancários) confirmam depois —
    // mesmo efeito de um pagamento recebido.
    t === "CHECKOUT.SESSION.ASYNC_PAYMENT_SUCCEEDED"
  ) {
    return "payment_received";
  }
  if (
    t.includes("OVERDUE") ||
    t === "INVOICE.PAYMENT_FAILED" ||
    t === "INVOICE.MARKED_UNCOLLECTIBLE" ||
    t === "CHECKOUT.SESSION.ASYNC_PAYMENT_FAILED"
  ) {
    return "payment_overdue";
  }
  if (t === "CHARGE.REFUNDED" || t === "REFUND.CREATED") return "payment_refunded";
  if (t === "CHARGE.DISPUTE.CREATED") return "payment_chargeback";
  // Disputa resolvida (won/lost/warning_closed) — reverte ou confirma o chargeback.
  if (t === "CHARGE.DISPUTE.CLOSED") return "payment_dispute_closed";
  if (t === "CUSTOMER.SUBSCRIPTION.UPDATED") return "subscription_updated";
  if (t.includes("SUBSCRIPTION_DELETED") || t === "CUSTOMER.SUBSCRIPTION.DELETED") {
    return "subscription_canceled";
  }
  return null;
}

async function buildJobPayload(event: WebhookEvent): Promise<Record<string, unknown> | null> {
  const p = event.payload;

  if (event.provider === "asaas") {
    // Eventos de Pix Automático trazem "pixAutomaticAuthorization" e "payment" como STRINGS (ids),
    // não como objeto — checar isso primeiro, senão o branch de payment abaixo (que espera objeto)
    // trataria a string incorretamente.
    const pixAutoAuthRef = p.pixAutomaticAuthorization as string | undefined;
    if (pixAutoAuthRef) {
      const { pixAutomaticAuthorization: pixAuthRepo } = await repositories();
      const localAuth = await pixAuthRepo.findOne({ where: { asaasAuthorizationId: pixAutoAuthRef } });
      if (!localAuth) {
        console.warn(
          `[billing-webhook] pix automático event sem autorização local correspondente, asaasAuthorizationId=${pixAutoAuthRef}`
        );
        return null;
      }
      const paymentRef = typeof p.payment === "string" ? p.payment : undefined;
      const { invoice: invRepoForPix } = await repositories();
      const invForPix = paymentRef
        ? await invRepoForPix.findOne({ where: { externalPaymentId: paymentRef } })
        : null;
      return {
        tenantId: localAuth.tenantId,
        authorizationId: localAuth.id,
        asaasAuthorizationId: pixAutoAuthRef,
        subscriptionId: localAuth.subscriptionId,
        paymentId: paymentRef,
        invoiceId: invForPix?.id,
        provider: "asaas"
      };
    }

    const payment = p.payment as Record<string, unknown> | undefined;
    if (payment) {
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
        paymentStatus: payment.status ?? null,
        partial: event.eventType.toUpperCase() === "PAYMENT_PARTIALLY_REFUNDED"
      };
    }

    // Eventos de assinatura (SUBSCRIPTION_*) vêm com chave "subscription", não "payment".
    const subscription = p.subscription as Record<string, unknown> | undefined;
    if (subscription) {
      const customerId = subscription.customer as string | undefined;
      const tenantId = customerId ? await resolveTenantFromAsaasPayment(customerId) : null;
      let resolvedTenantId = tenantId;
      if (!resolvedTenantId && subscription.id) {
        const { subscription: subRepo } = await repositories();
        const localSub = await subRepo.findOne({
          where: { externalSubscriptionId: subscription.id as string }
        });
        resolvedTenantId = localSub?.tenantId ?? null;
      }
      if (!resolvedTenantId) {
        console.warn(
          `[billing-webhook] asaas subscription event sem tenant resolvido, subscriptionId=${subscription.id}`
        );
        return null;
      }
      return {
        tenantId: resolvedTenantId,
        provider: "asaas",
        externalSubscriptionId: subscription.id ?? null,
        subscriptionStatus: subscription.status ?? null
      };
    }

    // Eventos de nota fiscal (INVOICE_*) — payload trazido pela Asaas sob a chave "invoice",
    // referente à NF-e, não confundir com a entidade Invoice (fatura) deste app.
    const nfeInvoice = p.invoice as Record<string, unknown> | undefined;
    if (nfeInvoice) {
      const { invoice: invRepo } = await repositories();
      const inv = nfeInvoice.id
        ? await invRepo.findOne({ where: { asaasInvoiceId: nfeInvoice.id as string } })
        : null;
      if (!inv) {
        console.warn(
          `[billing-webhook] asaas NF-e event sem invoice local correspondente, nfeId=${nfeInvoice.id}`
        );
        return null;
      }
      return {
        tenantId: inv.tenantId,
        invoiceId: inv.id,
        provider: "asaas",
        nfeStatus: nfeInvoice.status ?? null,
        nfeNumber: nfeInvoice.number ?? null,
        nfePdfUrl: nfeInvoice.pdfUrl ?? null
      };
    }

    console.warn(
      `[billing-webhook] asaas event com payload não reconhecido, type=${event.eventType} keys=${Object.keys(p).join(",")}`
    );
    return null;
  }

  if (event.provider === "stripe") {
    const obj = p;
    const customerId = (obj.customer as string) ?? null;
    const tenantIdFromCustomer = customerId
      ? await resolveTenantFromStripeCustomer(customerId)
      : null;
    const metadata = (obj.metadata as Record<string, string>) ?? {};
    const { plan: planRepo, invoice: invRepo } = await repositories();

    const paymentId =
      (obj.payment_intent as string) ??
      (obj.id as string | undefined);

    let inv =
      paymentId
        ? await invRepo.findOne({ where: { externalPaymentId: paymentId } })
        : null;
    if (!inv && obj.id) {
      inv = await invRepo.findOne({ where: { externalPaymentId: obj.id as string } });
    }

    const fallbackPlan = metadata.planId
      ? await planRepo.findOne({ where: { id: metadata.planId } })
      : null;

    const amountCents = obj.amount_total
      ? Number(obj.amount_total)
      : obj.amount_paid
        ? Number(obj.amount_paid)
        : inv?.amountCents;

    const taxCents =
      obj.total_details && typeof obj.total_details === "object"
        ? Number((obj.total_details as { tax_amount?: number }).tax_amount ?? 0)
        : undefined;

    const resolvedTenantId = metadata.tenantId ?? tenantIdFromCustomer ?? inv?.tenantId;
    if (!resolvedTenantId) {
      console.warn(
        `[billing-webhook] stripe event sem tenant resolvido, customer=${customerId} object=${obj.object}`
      );
    }

    return {
      tenantId: resolvedTenantId,
      invoiceId: inv?.id,
      planId: metadata.planId ?? inv?.planId ?? fallbackPlan?.id,
      provider: "stripe",
      externalCustomerId: customerId,
      externalSubscriptionId:
        (obj.subscription as string) ?? (obj.subscription_id as string) ?? null,
      billingCycle: metadata.billingCycle ?? inv?.billingCycle ?? "monthly",
      amountCents,
      taxCents,
      currency: (obj.currency as string)?.toUpperCase() ?? inv?.currency ?? "USD",
      paymentId,
      checkoutSessionId: obj.object === "checkout.session" ? (obj.id as string) : undefined,
      // Só presentes em objetos de subscription (customer.subscription.updated) — undefined
      // (e ignorado) para os demais tipos de evento.
      cancelAtPeriodEnd: obj.object === "subscription" ? Boolean(obj.cancel_at_period_end) : undefined,
      // Só presente em objetos de dispute (charge.dispute.closed): "won" | "lost" | "warning_closed".
      disputeStatus: obj.object === "dispute" ? (obj.status as string) : undefined,
      partial: false
    };
  }

  return null;
}
