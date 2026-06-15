import type { PaymentProvider } from "@/lib/billing/types";
import { isAsaasConfigured } from "@/lib/asaas/client";
import { isStripeConfigured } from "@/lib/stripe/client";
import { asaasProvider } from "./asaas-provider";
import { stripeProvider } from "./stripe-provider";
import type { BillingProvider } from "./types";

export type { BillingProvider, WebhookEvent } from "./types";

export type PaymentRegion = "br" | "intl";

export function getBillingProvider(provider: PaymentProvider): BillingProvider {
  if (provider === "stripe") return stripeProvider;
  return asaasProvider;
}

export function getAvailableProviders(): PaymentProvider[] {
  const providers: PaymentProvider[] = [];
  if (isAsaasConfigured()) providers.push("asaas");
  if (isStripeConfigured()) providers.push("stripe");
  return providers;
}

/** Default checkout region from locale when user has not chosen explicitly. */
export function defaultPaymentRegion(locale?: string | null): PaymentRegion {
  const providers = getAvailableProviders();
  if ((locale ?? "").startsWith("pt") && providers.includes("asaas")) return "br";
  if (providers.includes("stripe")) return "intl";
  return "br";
}

export function resolveCheckoutProvider(
  locale?: string | null,
  userChoice?: PaymentRegion | null
): PaymentProvider {
  const providers = getAvailableProviders();
  if (userChoice === "br" && providers.includes("asaas")) return "asaas";
  if (userChoice === "intl" && providers.includes("stripe")) return "stripe";
  if ((locale ?? "").startsWith("pt") && providers.includes("asaas")) return "asaas";
  if (providers.includes("stripe")) return "stripe";
  return providers[0] ?? "asaas";
}
