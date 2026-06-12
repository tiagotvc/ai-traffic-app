import { createStripeCheckoutSession, cancelStripeSubscription } from "@/lib/stripe/checkout";
import { createStripeCustomer } from "@/lib/stripe/customers";
import { verifyStripeWebhook, refundStripePayment } from "@/lib/stripe/webhooks";
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

export const stripeProvider: BillingProvider = {
  id: "stripe",

  async createCustomer(input: CreateCustomerInput): Promise<ExternalCustomer> {
    const c = await createStripeCustomer({
      email: input.email,
      name: input.name,
      metadata: input.metadata
    });
    return { id: c.id };
  },

  async createSubscription(input: CreateSubscriptionInput): Promise<ExternalSubscription> {
    if (!input.priceId || !input.successUrl || !input.cancelUrl) {
      throw new Error("Stripe subscription requires priceId and URLs");
    }
    const session = await createStripeCheckoutSession({
      customerId: input.customerId,
      priceId: input.priceId,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      metadata: input.metadata
    });
    return { id: session.subscription as string ?? session.id, checkoutUrl: session.url ?? undefined };
  },

  async cancelSubscription(externalId: string, atPeriodEnd = true) {
    await cancelStripeSubscription(externalId, atPeriodEnd);
  },

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    if (!input.priceId || !input.successUrl || !input.cancelUrl) {
      throw new Error("Stripe checkout requires priceId and URLs");
    }
    const session = await createStripeCheckoutSession({
      customerId: input.customerId,
      priceId: input.priceId,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      metadata: input.metadata
    });
    return { checkoutUrl: session.url ?? undefined };
  },

  async refundPayment(externalPaymentId: string, amountCents?: number): Promise<RefundResult> {
    const r = await refundStripePayment(externalPaymentId, amountCents);
    return { id: r.id };
  },

  async parseWebhook(req: Request): Promise<WebhookEvent> {
    const event = await verifyStripeWebhook(req);
    return {
      provider: "stripe",
      eventType: event.type,
      idempotencyKey: `stripe:${event.id}`,
      payload: event.data
    };
  }
};
