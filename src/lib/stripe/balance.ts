import { getStripeClient, isStripeConfigured } from "./client";

export async function getStripeBalance() {
  if (!isStripeConfigured()) return null;
  const stripe = getStripeClient();
  const balance = await stripe.balance.retrieve();
  const available = balance.available.map((b) => ({
    amountCents: b.amount,
    currency: b.currency.toUpperCase()
  }));
  const pending = balance.pending.map((b) => ({
    amountCents: b.amount,
    currency: b.currency.toUpperCase()
  }));
  return { available, pending };
}
