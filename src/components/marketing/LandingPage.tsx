import { getTranslations } from "next-intl/server";

import { BillingPlansClient } from "@/components/billing/BillingPlansClient";
import { LandingCapabilities } from "@/components/marketing/LandingCapabilities";
import { LandingCta } from "@/components/marketing/LandingMission";
import { LandingFaq } from "@/components/marketing/LandingFaq";
import { LandingHowItWorks } from "@/components/marketing/LandingHowItWorks";
import { LandingLegalStrip } from "@/components/marketing/LandingLegalStrip";
import { LandingProblem } from "@/components/marketing/LandingProblem";
import { LandingProductSamples } from "@/components/marketing/LandingProductSamples";
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

      <LandingProblem />

      <LandingWorkSplit />

      <LandingHowItWorks />

      <LandingProductSamples />

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

      <section id="pricing" className="marketing-section">
        <div className="mx-auto max-w-6xl space-y-8">
          <MarketingReveal className="text-center">
            <p className="marketing-section-title">{t("pricingBadge")}</p>
            <h2 className="marketing-section-heading">{t("pricingTitle")}</h2>
            <p className="marketing-section-sub mx-auto max-w-xl">{t("pricingSubtitle")}</p>
          </MarketingReveal>
          <BillingPlansClient variant="marketing" layout="slider" />
          <p className="text-center">
            <Link href="/pricing" className="text-sm font-semibold text-[var(--ui-accent)] hover:underline">
              {t("viewAllPlans")} →
            </Link>
          </p>
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
