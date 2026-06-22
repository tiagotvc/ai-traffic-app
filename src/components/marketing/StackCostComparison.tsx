"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { formatMoney } from "@/lib/billing/pricing";
import { isBrBillingMode, resolveBillingCurrency, resolvePlanMonthlyCents } from "@/lib/billing/currency";
import { cn } from "@/lib/cn";

type PlanRow = { slug: string; priceMonthlyCents: number; externalPrices?: { asaas?: { monthlyCents?: number } } | null };

const STACK_KEYS = ["stack1", "stack2", "stack3", "stack4", "stack5", "stack6"] as const;

export function StackCostComparison({ className }: { className?: string }) {
  const t = useTranslations("marketing");
  const locale = useLocale();
  const isBr = isBrBillingMode(locale);
  const currency = resolveBillingCurrency(locale);

  const [advancedCents, setAdvancedCents] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/billing/plans")
      .then((r) => r.json())
      .then((j) => {
        const plans = (j.plans ?? []) as PlanRow[];
        const advanced = plans.find((p) => p.slug === "advanced");
        if (advanced) {
          setAdvancedCents(resolvePlanMonthlyCents(advanced, currency));
        }
      })
      .catch(() => undefined);
  }, [currency]);

  const stackItems = useMemo(
    () =>
      STACK_KEYS.map((key) => ({
        key,
        label: t(`${key}Label`),
        price: t(isBr ? `${key}PriceBr` : `${key}PriceEn`)
      })),
    [isBr, t]
  );

  const stackTotal = t(isBr ? "stackTotalBr" : "stackTotalEn");
  const orionPrice = advancedCents != null ? formatMoney(advancedCents, currency) : t(isBr ? "orionFallbackBr" : "orionFallbackEn");
  const savings = t("stackSavings");

  return (
    <section className={cn("relative", className)}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-400/90">
            {t("stackBadge")}
          </p>
          <h2 className="font-heading text-2xl font-bold text-white sm:text-3xl">{t("stackTitle")}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-violet-200/70">
            {t("stackSubtitle")}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            <div className="grid grid-cols-[1fr_auto] gap-x-4 border-b border-white/10 bg-white/[0.04] px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-violet-300/70 sm:px-5">
              <span>{t("stackColTool")}</span>
              <span>{t("stackColPrice")}</span>
            </div>
            <ul>
              {stackItems.map((item) => (
                <li
                  key={item.key}
                  className="grid grid-cols-[1fr_auto] gap-x-4 border-b border-white/5 px-4 py-3.5 last:border-0 sm:px-5"
                >
                  <span className="text-sm text-violet-100/90">{item.label}</span>
                  <span className="text-sm font-semibold text-violet-200/60 line-through decoration-violet-400/40">
                    {item.price}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-white/10 bg-red-950/20 px-4 py-4 sm:px-5">
              <span className="text-sm font-semibold text-red-200/90">{t("stackTotalLabel")}</span>
              <span className="font-heading text-lg font-bold text-red-300">{stackTotal}</span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-br from-violet-950/80 via-indigo-950/80 to-slate-950/90 p-6 shadow-xl shadow-violet-950/40">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-500/15 blur-2xl" />
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-300/80">
              {t("orionLabel")}
            </p>
            <h3 className="mt-2 font-heading text-xl font-bold text-white">{t("orionPlanName")}</h3>
            <p className="mt-2 text-sm leading-relaxed text-violet-200/75">{t("orionIncludes")}</p>

            <div className="mt-6 flex items-baseline gap-2">
              <span className="font-heading text-4xl font-bold text-amber-300">{orionPrice}</span>
              <span className="text-sm text-violet-200/60">{t("orionPerMonth")}</span>
            </div>

            <div className="mt-4 inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/30">
              {savings}
            </div>

            <ul className="mt-6 space-y-2">
              {(["orionFeat1", "orionFeat2", "orionFeat3", "orionFeat4"] as const).map((key) => (
                <li key={key} className="flex items-start gap-2 text-sm text-violet-100/90">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
