import { getStripeClient } from "./client";

export async function verifyStripeWebhook(req: Request): Promise<{
  type: string;
  id: string;
  data: Record<string, unknown>;
}> {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET not configured");
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) throw new Error("Missing stripe-signature");
  const rawBody = await req.text();
  const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  return {
    type: event.type,
    id: event.id,
    data: event.data.object as unknown as Record<string, unknown>
  };
}

export async function refundStripePayment(chargeId: string, amountCents?: number) {
  const stripe = getStripeClient();
  return stripe.refunds.create({
    charge: chargeId,
    amount: amountCents
  });
}
