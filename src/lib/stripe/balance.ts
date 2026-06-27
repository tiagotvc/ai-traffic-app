import { getStripeClient, isStripeConfigured } from "./client";

export async function getStripeBalance() {
  if (!isStripeConfigured()) return null;
  const stripe = getStripeClient();
  const balance = await stripe.balance.retrieve();
  type BalanceAmount = { amount: number; currency: string };
  const available = balance.available.map((b: BalanceAmount) => ({
    amountCents: b.amount,
    currency: b.currency.toUpperCase()
  }));
  const pending = balance.pending.map((b: BalanceAmount) => ({
    amountCents: b.amount,
    currency: b.currency.toUpperCase()
  }));
  return { available, pending };
}
