import { getTranslations } from "next-intl/server";

import { BillingPlansClient } from "@/components/billing/BillingPlansClient";
import { BillingAtmosphere } from "@/components/billing/BillingAtmosphere";
import { PlanComparisonTable } from "@/components/billing/PlanComparisonTable";
import { LandingCapabilities } from "@/components/marketing/LandingCapabilities";
import { LandingCta } from "@/components/marketing/LandingMission";
import { LandingDashboardSection } from "@/components/marketing/LandingDashboardSection";
import { LandingDifferentiators } from "@/components/marketing/LandingDifferentiators";
import { LandingFaq } from "@/components/marketing/LandingFaq";
import { LandingHowItWorks } from "@/components/marketing/LandingHowItWorks";
import { LandingLegalStrip } from "@/components/marketing/LandingLegalStrip";
import { LandingProblem } from "@/components/marketing/LandingProblem";
import { LandingProof } from "@/components/marketing/LandingProof";
import { LandingStickyCta } from "@/components/marketing/LandingStickyCta";
import { LandingWorkSplit } from "@/components/marketing/LandingWorkSplit";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { MarketingReveal } from "@/components/marketing/motion/MarketingReveal";
import { StackCostComparison } from "@/components/marketing/StackCostComparison";
import { Link } from "@/i18n/navigation";

export async function LandingPage() {
  const t = await getTranslations("marketing");

  return (
    <>
      <MarketingHero />

      <LandingDashboardSection />

      <LandingProblem />

      <LandingDifferentiators />

      <LandingWorkSplit />

      <LandingHowItWorks />

      <LandingCapabilities />

      <section id="compare" className="marketing-section marketing-section-alt">
        <MarketingReveal>
          <div className="mx-auto mb-8 max-w-6xl text-center">
            <p className="marketing-section-title">{t("stackBadge")}</p>
            <h2 className="marketing-section-heading">{t("stackTitle")}</h2>
            <p className="marketing-section-sub mx-auto max-w-2xl">{t("stackSubtitle")}</p>
          </div>
        </MarketingReveal>
        <div className="mx-auto max-w-6xl">
          <StackCostComparison />
          <p className="mt-6 text-center">
            <Link href="#pricing" className="text-sm font-semibold text-[var(--ui-accent)] hover:underline">
              {t("compareToPricingCta")} →
            </Link>
          </p>
        </div>
      </section>

      <section id="pricing" className="marketing-section relative isolate overflow-hidden !py-16">
        <BillingAtmosphere />
        <div className="relative mx-auto max-w-6xl space-y-6">
          <MarketingReveal className="text-center">
            <p className="marketing-section-title">{t("pricingBadge")}</p>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-[var(--text-main)] sm:text-3xl">
              {t("pricingTitle")}
            </h2>
            <p className="marketing-section-sub mx-auto max-w-xl">{t("pricingSubtitle")}</p>
          </MarketingReveal>
          <BillingPlansClient variant="marketing" compact />
          <details className="group rounded-2xl border border-[var(--creator-card-border)] bg-[var(--creator-card-bg)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-heading text-sm font-semibold text-[var(--text-main)]">
              {t("pricingComparisonTitle")}
              <span className="text-lg text-[var(--ui-accent)] transition group-open:rotate-45" aria-hidden>
                +
              </span>
            </summary>
            <div className="border-t border-[var(--creator-card-border)] p-4 sm:p-6">
              <p className="mb-6 text-sm text-[var(--text-dim)]">{t("pricingComparisonSubtitle")}</p>
              <PlanComparisonTable />
            </div>
          </details>
        </div>
      </section>

      <LandingProof />

      <LandingFaq />

      <LandingCta />

      <LandingLegalStrip />

      <LandingStickyCta />
    </>
  );
}
