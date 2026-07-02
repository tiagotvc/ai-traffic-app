"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { BillingCycleToggle } from "@/components/billing/BillingCycleToggle";
import {
  BillingBackLink,
  PlanCard,
  type PlanCardData
} from "@/components/billing/PlanLimitsCard";
import { BillingPlansSkeleton } from "@/components/billing/BillingSkeletons";
import {
  ensureMarketingPaidPlans,
  mergePlanWithOfficialPricing,
  resolveMarketingVitrinePlans
} from "@/lib/marketing/orion-plan-catalog";
import { isBrBillingMode } from "@/lib/billing/currency";
import { YEARLY_DISCOUNT_PERCENT } from "@/lib/billing/pricing";
import { DsPageHeader } from "@/design-system";
import { Link } from "@/i18n/navigation";
import { CreditCard } from "lucide-react";
import { trackEvent, trackMetaEvent } from "@/lib/analytics";

export function BillingPlansClient({
  variant = "portal",
  compact = false,
  layout
}: {
  variant?: "portal" | "marketing";
  compact?: boolean;
  /** @deprecated mantido por compatibilidade; a vitrine de marketing usa grid de 3 cards. */
  layout?: "grid" | "slider";
}) {
  const t = useTranslations("billingPage");
  const tMarketing = useTranslations("marketing");
  const locale = useLocale();
  const isBr = isBrBillingMode(locale);
  const isMarketing = variant === "marketing";
  const [plans, setPlans] = useState<PlanCardData[]>([]);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(true);
  void layout;

  useEffect(() => {
    fetch("/api/billing/plans")
      .then((r) => r.json())
      .then((j) => {
        const rows = (j.plans ?? []) as PlanCardData[];
        setPlans(ensureMarketingPaidPlans(rows.map((p) => mergePlanWithOfficialPricing(p) as PlanCardData)));
      })
      .finally(() => setLoading(false));
  }, []);

  // Viewed the pricing table — funnel "interest" step (GA4 + Meta ViewContent).
  useEffect(() => {
    trackEvent("view_pricing", { surface: variant });
    void trackMetaEvent("ViewContent", { customData: { content_name: `pricing_${variant}` } });
  }, [variant]);

  const displayPlans = isMarketing ? resolveMarketingVitrinePlans(plans) : plans;

  if (loading) {
    return <BillingPlansSkeleton />;
  }

  return (
    <div className={`w-full pb-4 ${isMarketing ? (compact ? "space-y-5 px-0" : "space-y-10 px-0") : "space-y-8"}`}>
      {!isMarketing ? (
        <DsPageHeader
          breadcrumbs={<BillingBackLink href="/settings?tab=plan" />}
          title={t("plansTitle")}
          subtitle={t("plansSubtitle")}
          titleIcon={<CreditCard size={16} />}
        />
      ) : null}

      <BillingCycleToggle cycle={cycle} onChange={setCycle} variant={variant} />

      {isMarketing && cycle === "yearly" ? (
        <p className="text-center text-sm text-[var(--success)]">
          {tMarketing("pricingYearlyBanner", { percent: YEARLY_DISCOUNT_PERCENT })}
        </p>
      ) : null}

      <div className={isMarketing ? "pt-4" : undefined}>
        <div
          className={`grid items-stretch gap-5 ${
            isMarketing ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-4"
          }`}
        >
          {displayPlans.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              cycle={cycle}
              featured={p.slug === "advanced"}
              variant={variant}
              compact={compact}
            />
          ))}
        </div>
      </div>

      <p
        className="text-center text-xs text-[var(--text-dimmer)]"
      >
        {isBr ? t("plansFootnoteBr") : t("plansFootnote")}{" "}
        {!isMarketing ? (
          <Link href="/settings?tab=plan" className="ui-link">
            {t("backToPortal")}
          </Link>
        ) : null}
      </p>
    </div>
  );
}
