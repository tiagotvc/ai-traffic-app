"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { BillingCycleToggle } from "@/components/billing/BillingCycleToggle";
import { BillingPlansCarousel } from "@/components/billing/BillingPlansCarousel";
import { BillingBackLink, PlanCard, type PlanCardData } from "@/components/billing/PlanLimitsCard";
import { BillingPlansSkeleton } from "@/components/billing/BillingSkeletons";
import {
  ensureMarketingPaidPlans,
  mergePlanWithOfficialPricing,
  ORION_OFFICIAL_BRL_CENTS
} from "@/lib/marketing/orion-plan-catalog";
import { isBrBillingMode, resolveBillingCurrency } from "@/lib/billing/currency";
import { YEARLY_DISCOUNT_PERCENT } from "@/lib/billing/pricing";
import { Link } from "@/i18n/navigation";

const LANDING_PLAN_SLUGS = ["free", "individual", "advanced", "agency"] as const;

export function BillingPlansClient({
  variant = "portal",
  compact = false,
  layout
}: {
  variant?: "portal" | "marketing";
  compact?: boolean;
  /** Marketing landing: horizontal carousel with all plans */
  layout?: "grid" | "slider";
}) {
  const t = useTranslations("billingPage");
  const tMarketing = useTranslations("marketing");
  const locale = useLocale();
  const isBr = isBrBillingMode(locale);
  const currency = resolveBillingCurrency(locale);
  const isMarketing = variant === "marketing";
  const useSlider = isMarketing && (layout === "slider" || compact);
  const [plans, setPlans] = useState<PlanCardData[]>([]);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/billing/plans")
      .then((r) => r.json())
      .then((j) => {
        const rows = (j.plans ?? []) as PlanCardData[];
        setPlans(ensureMarketingPaidPlans(rows.map((p) => mergePlanWithOfficialPricing(p) as PlanCardData)));
      })
      .finally(() => setLoading(false));
  }, []);

  const paidPlans = plans.filter((p) => p.slug !== "free" && ORION_OFFICIAL_BRL_CENTS[p.slug]);
  const allMarketingPlans = [...plans.filter((p) => p.slug === "free"), ...paidPlans];
  const displayPlans =
    isMarketing && compact && layout !== "slider"
      ? LANDING_PLAN_SLUGS.map((slug) => allMarketingPlans.find((p) => p.slug === slug)).filter(
          (p): p is PlanCardData => Boolean(p)
        )
      : isMarketing
        ? allMarketingPlans
        : plans;

  if (loading) {
    return <BillingPlansSkeleton />;
  }

  return (
    <div className={`mx-auto max-w-6xl space-y-8 pb-4 ${isMarketing ? "px-0" : ""}`}>
      {!isMarketing ? <BillingBackLink href="/billing" /> : null}

      {!isMarketing ? (
        <div className="text-center">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-[var(--text-main)]">
            {t("plansTitle")}
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--text-dim)]">{t("plansSubtitle")}</p>
        </div>
      ) : null}

      <BillingCycleToggle cycle={cycle} onChange={setCycle} variant={variant} />

      {isMarketing && cycle === "yearly" ? (
        <p className="text-center text-sm text-emerald-300/90">
          {tMarketing("pricingYearlyBanner", { percent: YEARLY_DISCOUNT_PERCENT })}
        </p>
      ) : null}

      {useSlider ? (
        <BillingPlansCarousel plans={displayPlans} cycle={cycle} variant={variant} />
      ) : (
        <div
          className={`grid items-end gap-5 ${
            isMarketing
              ? compact
                ? "sm:grid-cols-2 lg:grid-cols-4"
                : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6"
              : "sm:grid-cols-2 xl:grid-cols-4"
          }`}
        >
          {displayPlans.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              cycle={cycle}
              featured={p.slug === "advanced"}
              variant={variant}
            />
          ))}
        </div>
      )}

      <p
        className={`text-center text-xs ${isMarketing ? "text-violet-200/50" : "text-[var(--text-dimmer)]"}`}
      >
        {isBr ? t("plansFootnoteBr") : t("plansFootnote")}{" "}
        {!isMarketing ? (
          <Link href="/billing" className="ui-link">
            {t("backToPortal")}
          </Link>
        ) : null}
      </p>
    </div>
  );
}
