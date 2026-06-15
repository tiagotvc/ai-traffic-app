import type { BillingCycle, ExternalPrices, PaymentProvider } from "./types";

export type BillingCurrency = "USD" | "BRL";

/** Billing ativo apenas via Asaas (BRL). */
export function isBrBillingMode(
  locale?: string | null,
  provider?: PaymentProvider | null
): boolean {
  if (provider === "asaas") return true;
  if (provider === "stripe") return false;
  return (locale ?? "").startsWith("pt");
}

export function resolveBillingCurrency(
  locale?: string | null,
  provider?: PaymentProvider | null
): BillingCurrency {
  if (provider === "stripe") return "USD";
  if (provider === "asaas") return "BRL";
  return (locale ?? "").startsWith("pt") ? "BRL" : "USD";
}

export function resolvePlanMonthlyCents(
  plan: { priceMonthlyCents: number; externalPrices?: ExternalPrices | null },
  currency: BillingCurrency
): number {
  if (currency === "BRL" && plan.externalPrices?.asaas?.monthlyCents != null) {
    return plan.externalPrices.asaas.monthlyCents;
  }
  return plan.priceMonthlyCents;
}

export function resolveStripePriceId(
  plan: { externalPrices?: ExternalPrices | null },
  cycle: BillingCycle
): string | null {
  const stripe = plan.externalPrices?.stripe;
  if (!stripe) return null;
  return cycle === "yearly" ? stripe.priceIdYearly ?? null : stripe.priceIdMonthly ?? null;
}

/** Centavos de lista antes dos descontos de checkout. */
export function planListCents(
  plan: {
    priceMonthlyCents: number;
    priceYearlyCents?: number;
    externalPrices?: ExternalPrices | null;
  },
  cycle: BillingCycle,
  currency: BillingCurrency
): number {
  if (cycle === "yearly" && currency === "BRL" && plan.externalPrices?.asaas?.yearlyCents != null) {
    return plan.externalPrices.asaas.yearlyCents;
  }
  if (cycle === "yearly" && plan.priceYearlyCents != null && plan.priceYearlyCents > 0) {
    return plan.priceYearlyCents;
  }
  const monthly = resolvePlanMonthlyCents(plan, currency);
  return cycle === "yearly" ? monthly * 12 : monthly;
}
