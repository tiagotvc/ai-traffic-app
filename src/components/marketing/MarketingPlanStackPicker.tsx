"use client";

import { useTranslations } from "next-intl";

import {
  planListCents,
  resolveBillingCurrency,
  resolvePlanMonthlyCents
} from "@/lib/billing/currency";
import {
  calculateCheckoutPricing,
  formatMoney,
  MONTHLY_PIX_DISCOUNT_PERCENT,
  YEARLY_PIX_DISCOUNT_PERCENT
} from "@/lib/billing/pricing";
import type { MarketingPlanRow } from "@/lib/marketing/orion-plan-catalog";
import { cn } from "@/lib/cn";

export function MarketingPlanStackPicker({
  plans,
  cycle,
  selectedSlug,
  onSelect,
  locale
}: {
  plans: MarketingPlanRow[];
  cycle: "monthly" | "yearly";
  selectedSlug: string;
  onSelect: (slug: string) => void;
  locale: string;
}) {
  const tBilling = useTranslations("billingPage");
  const currency = resolveBillingCurrency(locale);

  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-5 px-1 pt-3 sm:grid-cols-3">
      {plans.map((plan) => {
        const isSelected = plan.slug === selectedSlug;
        const isPopular = plan.slug === "advanced";
        const monthlyCents = resolvePlanMonthlyCents(plan, currency);
        const pricing = calculateCheckoutPricing({
          priceMonthlyCents: monthlyCents,
          listCents: planListCents(plan, cycle, currency),
          cycle,
          provider: "asaas",
          billingType: "CREDIT_CARD"
        });
        const pixPercent = cycle === "yearly" ? YEARLY_PIX_DISCOUNT_PERCENT : MONTHLY_PIX_DISCOUNT_PERCENT;

        return (
          <button
            key={plan.slug}
            type="button"
            onClick={() => onSelect(plan.slug)}
            aria-pressed={isSelected}
            className={cn(
              "group relative flex h-full min-w-0 cursor-pointer flex-col rounded-2xl border p-5 text-left transition-all duration-300 will-change-transform",
              isSelected
                ? "z-10 scale-[1.05] border-[var(--ui-accent-border)] bg-[var(--surface-card)] shadow-xl shadow-black/30 ring-2 ring-[var(--ui-accent-ring)]"
                : "border-white/10 bg-white/[0.03] opacity-70 hover:-translate-y-1 hover:border-white/25 hover:opacity-100"
            )}
          >
            {isPopular ? (
              <span className="absolute -top-2.5 left-5 rounded-full bg-[var(--ui-accent)] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--ui-accent-btn-text)] shadow-md">
                {tBilling("mostPopular")}
              </span>
            ) : null}

            {/* selection indicator */}
            <span
              aria-hidden
              className={cn(
                "absolute right-4 top-4 flex h-4 w-4 items-center justify-center rounded-full border transition-colors",
                isSelected ? "border-[var(--ui-accent)] bg-[var(--ui-accent)]" : "border-white/25 group-hover:border-white/50"
              )}
            >
              {isSelected ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
            </span>

            <div className="flex flex-1 flex-col">
              <p className="pr-6 font-heading text-base font-bold text-white">{plan.name}</p>

              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="font-heading text-[1.7rem] font-bold leading-none text-white">
                  {formatMoney(pricing.finalCents, currency)}
                </span>
                <span className="text-[0.6rem] uppercase tracking-wide text-white/55">
                  {cycle === "yearly" ? tBilling("perYear") : tBilling("perMonth")}
                </span>
              </div>
              {pricing.discountPercent > 0 ? (
                <span className="mt-1 text-[0.62rem] text-white/40 line-through">
                  {formatMoney(pricing.listCents, currency)}
                </span>
              ) : null}

              {plan.description ? (
                <p className="mt-3 text-xs leading-snug text-white/60">{plan.description}</p>
              ) : null}

              <span className="mt-auto inline-flex items-center gap-1.5 self-start pt-5 text-[0.6rem] font-semibold uppercase tracking-wide text-emerald-300">
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.14em] text-emerald-200">
                  PIX
                </span>
                -{pixPercent}%
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
