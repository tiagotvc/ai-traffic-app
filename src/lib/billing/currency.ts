import type { BillingCycle, ExternalPrices, PaymentProvider } from "./types";

export type BillingCurrency = "USD" | "BRL";

/** Billing ativo apenas via Asaas (BRL). */
export function isBrBillingMode(
  locale?: string | null,
  provider?: PaymentProvider | null
): boolean {
  if (provider === "asaas") return true;
  return (locale ?? "").startsWith("pt") || provider !== "stripe";
}

export function resolveBillingCurrency(
  locale?: string | null,
  provider?: PaymentProvider | null
): BillingCurrency {
  if (provider === "stripe") return "USD";
  return "BRL";
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

/** Centavos de lista antes dos descontos de checkout. */
export function planListCents(
  plan: {
    priceMonthlyCents: number;
    externalPrices?: ExternalPrices | null;
  },
  cycle: BillingCycle,
  currency: BillingCurrency
): number {
  if (cycle === "yearly" && currency === "BRL" && plan.externalPrices?.asaas?.yearlyCents != null) {
    return plan.externalPrices.asaas.yearlyCents;
  }
  const monthly = resolvePlanMonthlyCents(plan, currency);
  return cycle === "yearly" ? monthly * 12 : monthly;
}
