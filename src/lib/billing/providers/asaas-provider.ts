import { createAsaasCustomer } from "@/lib/asaas/customers";
import {
  createAsaasPayment,
  getAsaasPixQr,
  listAsaasPaymentsBySubscription,
  tokenizeAsaasCreditCard
} from "@/lib/asaas/payments";
import { refundAsaasPayment } from "@/lib/asaas/refunds";
import { createAsaasSubscription, cancelAsaasSubscription } from "@/lib/asaas/subscriptions";
import { verifyAsaasWebhookToken, type AsaasWebhookPayload } from "@/lib/asaas/webhook-verify";
import type {
  BillingProvider,
  CheckoutInput,
  CheckoutResult,
  CreateCustomerInput,
  CreateSubscriptionInput,
  ExternalCustomer,
  ExternalSubscription,
  RefundResult,
  WebhookEvent
} from "./types";

export const asaasProvider: BillingProvider = {
  id: "asaas",

  async createCustomer(input: CreateCustomerInput): Promise<ExternalCustomer> {
    if (!input.cpfCnpj) throw new Error("CPF/CNPJ required for Asaas");
    const c = await createAsaasCustomer({
      name: input.name,
      email: input.email,
      cpfCnpj: input.cpfCnpj,
      phone: input.phone,
      postalCode: input.postalCode,
      address: input.address,
      addressNumber: input.addressNumber,
      city: input.city,
      state: input.state
    });
    return { id: c.id };
  },

  async createSubscription(input: CreateSubscriptionInput): Promise<ExternalSubscription> {
    const cycle = input.cycle === "yearly" ? "YEARLY" : "MONTHLY";
    const sub = await createAsaasSubscription({
      customerId: input.customerId,
      billingType: input.billingType ?? "CREDIT_CARD",
      valueCents: input.valueCents,
      cycle,
      description: input.description,
      creditCardToken: input.creditCardToken,
      remoteIp: input.remoteIp
    });

    let paymentId: string | undefined;
    try {
      const payments = await listAsaasPaymentsBySubscription(sub.id);
      paymentId = payments.data?.[0]?.id;
    } catch {
      /* first payment may arrive via webhook */
    }

    return { id: sub.id, paymentId };
  },

  async cancelSubscription(externalId: string) {
    await cancelAsaasSubscription(externalId);
  },

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const billingType = input.billingType ?? "PIX";
    const dueDate = input.dueDate ?? new Date().toISOString().slice(0, 10);

    if (billingType === "CREDIT_CARD" && input.creditCardToken) {
      const installments = input.installmentCount ?? 1;
      const payment = await createAsaasPayment({
        customerId: input.customerId,
        billingType: "CREDIT_CARD",
        valueCents: input.valueCents,
        dueDate,
        description: input.description,
        creditCardToken: input.creditCardToken,
        installmentCount: installments,
        remoteIp: input.remoteIp
      });
      return {
        paymentId: payment.id,
        invoiceUrl: payment.invoiceUrl ?? payment.transactionReceiptUrl
      };
    }

    const payment = await createAsaasPayment({
      customerId: input.customerId,
      billingType: "PIX",
      valueCents: input.valueCents,
      dueDate,
      description: input.description
    });
    let pixQrCode: string | undefined;
    let pixCopyPaste: string | undefined;
    let pixExpiresAt: string | undefined;
    try {
      const qr = await getAsaasPixQr(payment.id);
      pixQrCode = qr.encodedImage;
      pixCopyPaste = qr.payload;
      pixExpiresAt = qr.expirationDate;
    } catch {
      /* PIX QR may not be ready instantly */
    }
    return {
      paymentId: payment.id,
      pixQrCode,
      pixCopyPaste,
      pixExpiresAt,
      invoiceUrl: payment.invoiceUrl
    };
  },

  async refundPayment(externalPaymentId: string, amountCents?: number): Promise<RefundResult> {
    const r = await refundAsaasPayment(externalPaymentId, amountCents);
    return { id: r.id };
  },

  async parseWebhook(req: Request): Promise<WebhookEvent> {
    if (!verifyAsaasWebhookToken(req)) {
      throw new Error("Invalid Asaas webhook token");
    }
    const payload = (await req.json()) as AsaasWebhookPayload;
    const paymentId = payload.payment?.id;
    const key = paymentId
      ? `${payload.event}:${paymentId}`
      : (payload.id ?? `${payload.event}-${Date.now()}`);
    return {
      provider: "asaas",
      eventType: payload.event,
      idempotencyKey: `asaas:${key}`,
      payload: payload as unknown as Record<string, unknown>
    };
  }
};

export { tokenizeAsaasCreditCard };
