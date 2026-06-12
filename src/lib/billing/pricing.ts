import type { BillingCycle, PaymentProvider } from "./types";

export type PricingInput = {
  priceMonthlyCents: number;
  cycle: BillingCycle;
  provider: PaymentProvider;
  billingType?: "PIX" | "CREDIT_CARD";
  /** 1 = à vista; 2+ = parcelado (apenas anual + cartão) */
  installmentCount?: number;
};

export type PricingBreakdown = {
  listCents: number;
  discountPercent: number;
  discountCents: number;
  finalCents: number;
  installmentCount: number;
  installmentValueCents: number | null;
  couponCode?: string;
  couponPercent?: number;
  couponCents?: number;
};

/** Desconto base anual (cartão à vista ou parcelado). */
export const YEARLY_DISCOUNT_PERCENT = 10;
/** Desconto anual + PIX. */
export const YEARLY_PIX_DISCOUNT_PERCENT = 15;
/** Desconto mensal + PIX. */
export const MONTHLY_PIX_DISCOUNT_PERCENT = 5;

export function getDiscountPercent(input: PricingInput): number {
  const billingType = input.billingType ?? "CREDIT_CARD";

  if (input.cycle === "monthly") {
    if (input.provider === "asaas" && billingType === "PIX") return MONTHLY_PIX_DISCOUNT_PERCENT;
    return 0;
  }

  if (input.provider === "asaas" && billingType === "PIX") return YEARLY_PIX_DISCOUNT_PERCENT;
  return YEARLY_DISCOUNT_PERCENT;
}

export function getListAmountCents(priceMonthlyCents: number, cycle: BillingCycle): number {
  if (cycle === "yearly") return priceMonthlyCents * 12;
  return priceMonthlyCents;
}

export function calculateCheckoutPricing(
  input: PricingInput & { listCents?: number }
): PricingBreakdown {
  const listCents = input.listCents ?? getListAmountCents(input.priceMonthlyCents, input.cycle);
  const discountPercent = getDiscountPercent(input);
  const discountCents = Math.round((listCents * discountPercent) / 100);
  const finalCents = listCents - discountCents;

  const installmentCount =
    input.cycle === "yearly" &&
    input.billingType === "CREDIT_CARD" &&
    input.provider === "asaas" &&
    (input.installmentCount ?? 1) >= 2
      ? Math.min(12, Math.max(2, input.installmentCount ?? 2))
      : 1;

  const installmentValueCents =
    installmentCount >= 2 ? Math.round(finalCents / installmentCount) : null;

  return {
    listCents,
    discountPercent,
    discountCents,
    finalCents,
    installmentCount,
    installmentValueCents
  };
}

export function formatMoney(cents: number, currency = "USD"): string {
  const value = cents / 100;
  if (currency === "BRL") {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  const formatted = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
  return `$${formatted}`;
}

export function formatMoneyParts(cents: number, currency = "USD") {
  const value = cents / 100;
  if (currency === "BRL") {
    const amount = value.toLocaleString("pt-BR", {
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2
    });
    return { symbol: "R$", amount, currency: "BRL", full: `R$ ${amount}` };
  }
  const amount = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
  return { symbol: "$", amount, currency: "USD", full: `$${amount}` };
}
