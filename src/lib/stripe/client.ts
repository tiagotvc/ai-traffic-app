import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeConfig() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
  return {
    secretKey,
    webhookSecret,
    publishableKey,
    configured: !!secretKey
  };
}

export function isStripeConfigured() {
  return getStripeConfig().configured;
}

export function getStripeClient(): Stripe {
  const { secretKey } = getStripeConfig();
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY not configured");
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }
  return stripeClient;
}

export function getStripePublishableKey() {
  return getStripeConfig().publishableKey;
}
