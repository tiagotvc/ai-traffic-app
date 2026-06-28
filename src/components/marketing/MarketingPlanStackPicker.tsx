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
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3">
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
            className={cn(
              "relative flex h-full min-w-0 flex-col rounded-2xl border p-4 text-left transition-all duration-300",
              isSelected
                ? "z-10 border-violet-400/50 bg-gradient-to-br from-violet-950/95 via-indigo-950/90 to-slate-950/95 shadow-xl shadow-violet-900/35 ring-2 ring-violet-400/40"
                : "border-white/10 bg-white/[0.03] opacity-80 hover:border-white/20 hover:opacity-100"
            )}
          >
            {isPopular ? (
              <span className="absolute -top-2.5 left-4 rounded-full bg-[var(--ui-accent)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--ui-accent-btn-text)] shadow-md">
                {tBilling("mostPopular")}
              </span>
            ) : null}

            <div className={cn("flex flex-1 flex-col", isPopular && "pt-1")}>
              <p className="font-heading text-base font-bold text-white">{plan.name}</p>
              {plan.description ? (
                <p className="mt-1 text-sm leading-snug text-violet-200/75">{plan.description}</p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-baseline gap-2">
                {pricing.discountPercent > 0 ? (
                  <span className="text-sm text-violet-300/45 line-through">
                    {formatMoney(pricing.listCents, currency)}
                  </span>
                ) : null}
                <span className="font-heading text-2xl font-bold text-white">
                  {formatMoney(pricing.finalCents, currency)}
                </span>
                <span className="text-sm text-violet-200/60">
                  {cycle === "yearly" ? tBilling("perYear") : tBilling("perMonth")}
                </span>
              </div>

              <div className="mt-auto pt-3 inline-flex w-full items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-teal-500/30 to-emerald-500/30 px-3 py-2 text-xs font-semibold text-teal-100 ring-1 ring-teal-400/50">
                <span className="flex items-center gap-2">
                  <span className="rounded bg-teal-500/30 px-1.5 py-0.5 text-[9px] font-black tracking-widest text-teal-100">
                    PIX
                  </span>
                  {tBilling("discountPixLabel")}
                </span>
                <span className="rounded-lg bg-white/20 px-2 py-1 text-xs font-black">-{pixPercent}%</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
