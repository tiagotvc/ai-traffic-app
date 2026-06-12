import type { BillingCycle, PaymentProvider } from "@/lib/billing/types";

export type WebhookEvent = {
  provider: PaymentProvider;
  eventType: string;
  idempotencyKey: string;
  tenantId?: string;
  payload: Record<string, unknown>;
};

export type CreateCustomerInput = {
  name: string;
  email: string;
  cpfCnpj?: string;
  phone?: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  city?: string;
  state?: string;
  metadata?: Record<string, string>;
};

export type ExternalCustomer = { id: string };

export type CreateSubscriptionInput = {
  customerId: string;
  valueCents: number;
  cycle: BillingCycle;
  description: string;
  billingType?: "PIX" | "CREDIT_CARD";
  creditCardToken?: string;
  installmentCount?: number;
  remoteIp?: string;
  priceId?: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
};

export type ExternalSubscription = {
  id: string;
  paymentId?: string;
  checkoutUrl?: string;
  clientSecret?: string;
};

export type CheckoutInput = CreateSubscriptionInput & {
  dueDate?: string;
};

export type CheckoutResult = {
  subscriptionId?: string;
  paymentId?: string;
  checkoutUrl?: string;
  clientSecret?: string;
  pixQrCode?: string;
  pixCopyPaste?: string;
  pixExpiresAt?: string;
  invoiceUrl?: string;
};

export type RefundResult = { id: string };

export interface BillingProvider {
  id: PaymentProvider;
  createCustomer(input: CreateCustomerInput): Promise<ExternalCustomer>;
  createSubscription(input: CreateSubscriptionInput): Promise<ExternalSubscription>;
  cancelSubscription(externalId: string, atPeriodEnd?: boolean): Promise<void>;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  refundPayment(externalPaymentId: string, amountCents?: number): Promise<RefundResult>;
  parseWebhook(req: Request): Promise<WebhookEvent>;
}
