import { getStripeClient } from "./client";

export async function createStripeCheckoutSession(input: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  idempotencyKey?: string;
}) {
  const stripe = getStripeClient();
  return stripe.checkout.sessions.create(
    {
      mode: "subscription",
      customer: input.customerId,
      line_items: [{ price: input.priceId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      // Stripe Tax não está disponível pra contas registradas em países fora da lista suportada
      // (confirmado testando: "Stripe Tax is not supported for your account country") — deixar
      // automatic_tax ligado quebra 100% dos checkouts, não só em sandbox. Se um dia a conta
      // Stripe passar a suportar (ex: expansão pra outro país), reavaliar ligar de novo.
      // tax_id_collection exige customer_update.name (confirmado testando: "Tax ID collection
      // requires updating business name on the customer").
      customer_update: { address: "auto", name: "auto" },
      tax_id_collection: { enabled: true },
      excluded_payment_method_types: ["pix", "boleto"],
      metadata: input.metadata,
      subscription_data: {
        metadata: input.metadata
      }
    },
    input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined
  );
}

export async function createStripeBillingPortalSession(input: {
  customerId: string;
  returnUrl: string;
}) {
  const stripe = getStripeClient();
  return stripe.billingPortal.sessions.create({
    customer: input.customerId,
    return_url: input.returnUrl
  });
}

export async function cancelStripeSubscription(subscriptionId: string, atPeriodEnd = true) {
  const stripe = getStripeClient();
  if (atPeriodEnd) {
    return stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
  }
  return stripe.subscriptions.cancel(subscriptionId);
}

/** Desfaz um cancelamento de renovação agendado (cancel_at_period_end: true → false). */
export async function resumeStripeSubscription(subscriptionId: string) {
  const stripe = getStripeClient();
  return stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: false });
}

export async function getStripeSubscription(subscriptionId: string) {
  const stripe = getStripeClient();
  return stripe.subscriptions.retrieve(subscriptionId);
}
