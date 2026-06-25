import { getTranslations } from "next-intl/server";

import { BillingPlansClient } from "@/components/billing/BillingPlansClient";
import { LandingCapabilities } from "@/components/marketing/LandingCapabilities";
import { LandingCta, LandingMission } from "@/components/marketing/LandingMission";
import { LandingFaq } from "@/components/marketing/LandingFaq";
import { LandingProductPreview } from "@/components/marketing/LandingProductPreview";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { StackCostComparison } from "@/components/marketing/StackCostComparison";
import { Link } from "@/i18n/navigation";

export async function LandingPage() {
  const t = await getTranslations("marketing");

  return (
    <>
      <MarketingHero />

      <LandingMission />

      <LandingCapabilities />

      <LandingProductPreview />

      <section id="compare" className="border-b border-white/5 bg-[#0d1520] px-4 py-16 sm:px-6 sm:py-20">
        <StackCostComparison />
      </section>

      <section id="product" className="border-b border-white/5 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-heading text-2xl font-bold text-white sm:text-3xl">{t("productTitle")}</h2>
          <p className="mt-3 max-w-2xl text-violet-200/70">{t("productSubtitle")}</p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {(["pillar1", "pillar2", "pillar3"] as const).map((key) => (
              <div
                key={key}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-violet-400/25 hover:bg-white/[0.05]"
              >
                <h3 className="font-heading text-lg font-semibold text-white">{t(`${key}Title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-violet-200/65">{t(`${key}Body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-[#0a0f14] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-400/90">
              {t("pricingBadge")}
            </p>
            <h2 className="font-heading text-2xl font-bold text-white sm:text-3xl">{t("pricingTitle")}</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-violet-200/65">{t("pricingSubtitle")}</p>
          </div>
          <BillingPlansClient variant="marketing" layout="slider" />
          <p className="text-center">
            <Link href="/pricing" className="text-sm font-semibold text-amber-400 hover:text-amber-300">
              {t("viewAllPlans")} →
            </Link>
          </p>
        </div>
      </section>

      <LandingFaq />

      <LandingCta />
    </>
  );
}
