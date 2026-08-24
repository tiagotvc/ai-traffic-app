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

/**
 * Moeda em que o plano é REALMENTE cobrado, para uso na vitrine de preços.
 *
 * Diferente de `resolveBillingCurrency`, que decide pelo idioma: os planos pagos
 * estão precificados em BRL e a cobrança sai em BRL pelo Asaas (inclusive em
 * cartão internacional). Resolver pelo idioma fazia o site em inglês trocar só o
 * símbolo, exibindo `$59.90` para um plano de R$ 59,90 — cinco vezes o valor real
 * e diferente do que chega na fatura.
 *
 * O plano gratuito não tem preço, então cai no idioma sem prejuízo.
 */
export function resolvePlanDisplayCurrency(
  plan: { currency?: string | null; priceMonthlyCents?: number },
  locale?: string | null
): BillingCurrency {
  const planCurrency = plan.currency?.toUpperCase();
  if ((plan.priceMonthlyCents ?? 0) > 0 && (planCurrency === "BRL" || planCurrency === "USD")) {
    return planCurrency;
  }
  return resolveBillingCurrency(locale);
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
