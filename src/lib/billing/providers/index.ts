import type { PaymentProvider } from "@/lib/billing/types";
import { asaasProvider } from "./asaas-provider";
import { stripeProvider } from "./stripe-provider";
import type { BillingProvider } from "./types";

export type { BillingProvider, WebhookEvent } from "./types";

export function getBillingProvider(provider: PaymentProvider): BillingProvider {
  if (provider === "stripe") return stripeProvider;
  return asaasProvider;
}

export function getAvailableProviders(): PaymentProvider[] {
  if (process.env.ASAAS_API_KEY?.trim()) return ["asaas"];
  return [];
}
