import { getStripeClient } from "./client";

export async function createStripeCustomer(input: {
  email: string;
  name: string;
  metadata?: Record<string, string>;
}) {
  const stripe = getStripeClient();
  return stripe.customers.create({
    email: input.email,
    name: input.name,
    metadata: input.metadata
  });
}

export async function getStripeCustomer(customerId: string) {
  const stripe = getStripeClient();
  return stripe.customers.retrieve(customerId);
}
