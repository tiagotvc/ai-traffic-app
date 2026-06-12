"use client";

import { useTranslations } from "next-intl";
import { PlanLimitsGrid } from "@/components/billing/BillingLimitsPanel";
import { CheckoutPlanSwitcher } from "@/components/billing/CheckoutPlanSwitcher";
import { formatMoney, type PricingBreakdown } from "@/lib/billing/pricing";
import type { PlanCardData } from "@/components/billing/PlanLimitsCard";
type InstallmentSimulateRow = {
  installmentCount: number;
  paymentValueCents: number;
  feePercentage: number;
  feeValueCents: number;
  totalCents: number;
};

export function BillingCheckoutSummary({
  plan,
  plans,
  cycle,
  pricing,
  currency,
  billingType,
  installmentSim,
  onPlanChange,
  planSwitcherLoading
}: {
  plan: PlanCardData;
  plans?: PlanCardData[];
  cycle: "monthly" | "yearly";
  pricing: PricingBreakdown;
  currency: string;
  billingType?: "PIX" | "CREDIT_CARD";
  installmentSim?: InstallmentSimulateRow | null;
  onPlanChange?: (planId: string) => void;
  planSwitcherLoading?: boolean;
}) {
  const t = useTranslations("billingPage");
  const isPremium = plan.slug === "agency";

  const paymentLabel = billingType === "PIX" ? "PIX" : t("creditCard");
  const displayTotal = installmentSim?.totalCents ?? pricing.finalCents;
  const displayInstallment =
    installmentSim?.paymentValueCents ?? pricing.installmentValueCents;
  const installmentCount = installmentSim?.installmentCount ?? pricing.installmentCount;

  return (
    <div className="space-y-5">
      <div
        className={`overflow-hidden rounded-2xl border shadow-sm ${
          isPremium
            ? "border-slate-700 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
            : "border-violet-100 bg-gradient-to-br from-violet-50 via-white to-slate-50"
        }`}
      >
        <div
          className={`px-6 py-5 ${isPremium ? "border-b border-slate-700" : "border-b border-violet-100/80 bg-violet-600/5"}`}
        >
          {plans && onPlanChange ? (
            <div
              className={`mb-5 rounded-xl border p-4 ${
                isPremium
                  ? "border-slate-600/60 bg-white shadow-sm [&_.checkout-plan-switcher-header]:text-slate-500 [&_.checkout-plan-switcher-link]:text-violet-600"
                  : "border-slate-200/80 bg-white/80"
              }`}
            >
              <CheckoutPlanSwitcher
                plans={plans}
                selectedPlanId={plan.id}
                cycle={cycle}
                billingType={billingType ?? "CREDIT_CARD"}
                currency={currency}
                onSelect={onPlanChange}
                loading={planSwitcherLoading}
              />
            </div>
          ) : (
            <>
              <p
                className={`text-xs font-semibold uppercase tracking-wide ${isPremium ? "text-amber-400" : "text-violet-600"}`}
              >
                {t("yourPlan")}
              </p>
              <h2 className={`mt-1 text-2xl font-bold ${isPremium ? "text-white" : "text-slate-900"}`}>
                {plan.name}
              </h2>
              {plan.description ? (
                <p className={`mt-2 text-sm leading-relaxed ${isPremium ? "text-slate-300" : "text-slate-500"}`}>
                  {plan.description}
                </p>
              ) : null}
            </>
          )}

          <div className={`flex flex-wrap gap-2 ${plans && onPlanChange ? "" : "mt-4"}`}>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                isPremium ? "bg-white/15 text-white" : "bg-violet-100 text-violet-700"
              }`}
            >
              {cycle === "yearly" ? t("yearly") : t("monthly")}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                isPremium ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {paymentLabel}
            </span>
            {pricing.discountPercent > 0 ? (
              <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white">
                {t("discountBadge", { percent: pricing.discountPercent })}
              </span>
            ) : null}
          </div>
        </div>

        <div className={`px-6 py-5 ${isPremium ? "text-white" : ""}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide ${isPremium ? "text-slate-400" : "text-slate-500"}`}>
            {t("checkoutTotal")}
          </p>
          {pricing.discountPercent > 0 ? (
            <p className={`mt-1 text-sm line-through ${isPremium ? "text-slate-500" : "text-slate-400"}`}>
              {formatMoney(pricing.listCents, currency)}
            </p>
          ) : null}
          <p className="mt-1 text-4xl font-extrabold tracking-tight">
            {formatMoney(displayTotal, currency)}
            <span className={`ml-1 text-base font-medium ${isPremium ? "text-slate-400" : "text-slate-500"}`}>
              {cycle === "yearly" ? t("perYear") : t("perMonth")}
            </span>
          </p>
          {installmentCount >= 2 && displayInstallment ? (
            <p className={`mt-2 text-sm font-medium ${isPremium ? "text-amber-300" : "text-violet-700"}`}>
              {t("installmentSummary", {
                count: installmentCount,
                value: formatMoney(displayInstallment, currency)
              })}
            </p>
          ) : null}
          {installmentSim && installmentSim.feeValueCents > 0 ? (
            <p className={`mt-1 text-xs ${isPremium ? "text-slate-400" : "text-slate-500"}`}>
              {t("installmentFee", {
                percent: installmentSim.feePercentage,
                value: formatMoney(installmentSim.feeValueCents, currency)
              })}
            </p>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
          {t("checkoutOrderSummary")}
        </h3>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">{t("checkoutSubtotal")}</dt>
            <dd className="font-semibold text-slate-900">{formatMoney(pricing.listCents, currency)}</dd>
          </div>
          {pricing.discountPercent > 0 ? (
            <div className="flex justify-between gap-4 text-emerald-700">
              <dt>{t("checkoutDiscount")}</dt>
              <dd className="font-semibold">
                -{formatMoney(pricing.discountCents, currency)} ({pricing.discountPercent}%)
              </dd>
            </div>
          ) : null}
          {pricing.couponCents && pricing.couponCents > 0 ? (
            <div className="flex justify-between gap-4 text-violet-700">
              <dt>{t("couponDiscount", { code: pricing.couponCode ?? "" })}</dt>
              <dd className="font-semibold">-{formatMoney(pricing.couponCents, currency)}</dd>
            </div>
          ) : null}
          {installmentSim && installmentSim.feeValueCents > 0 ? (
            <div className="flex justify-between gap-4 text-slate-600">
              <dt>{t("installmentTotalWithFees")}</dt>
              <dd className="font-semibold">{formatMoney(installmentSim.feeValueCents, currency)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4 border-t border-slate-100 pt-3">
            <dt className="font-bold text-slate-900">{t("checkoutTotal")}</dt>
            <dd className="text-lg font-extrabold text-violet-700">
              {formatMoney(displayTotal, currency)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
          {t("checkoutIncludes")}
        </h3>
        <PlanLimitsGrid limits={plan.limits} />
      </div>

      <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-900">
        <p className="font-semibold">{t("checkoutNfTitle")}</p>
        <p className="mt-1 text-emerald-800/90">{t("checkoutNfHint")}</p>
      </div>

      <p className="text-center text-xs text-slate-400">{t("checkoutSecureHint")}</p>
    </div>
  );
}
