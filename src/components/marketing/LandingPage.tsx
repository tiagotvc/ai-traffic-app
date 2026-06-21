import { getTranslations } from "next-intl/server";

import { BillingPlansClient } from "@/components/billing/BillingPlansClient";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { Link } from "@/i18n/navigation";

export async function LandingPage() {
  const t = await getTranslations("marketing");
  const tAuth = await getTranslations("auth");

  return (
    <>
      <MarketingHero />

      <section id="product" className="border-b border-white/5 bg-[#0d1520] px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-heading text-2xl font-bold text-white sm:text-3xl">{t("productTitle")}</h2>
          <p className="mt-3 max-w-2xl text-violet-200/70">{t("productSubtitle")}</p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {(["pillar1", "pillar2", "pillar3"] as const).map((key) => (
              <div
                key={key}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
              >
                <h3 className="font-heading text-lg font-semibold text-white">{t(`${key}Title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-violet-200/65">{t(`${key}Body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/5 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-gradient-to-br from-violet-900/40 to-indigo-950/40 p-8 sm:p-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-bold text-white">{tAuth("statValue")}</p>
              <p className="text-sm text-violet-200/70">{tAuth("statLabel")}</p>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-violet-200/60">{tAuth("trustLine")}</p>
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-[#0a0f14] px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="text-center">
            <h2 className="font-heading text-2xl font-bold text-white sm:text-3xl">{t("pricingTitle")}</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-violet-200/65">{t("pricingSubtitle")}</p>
          </div>
          <BillingPlansClient variant="marketing" />
          <p className="text-center">
            <Link href="/pricing" className="text-sm font-semibold text-amber-400 hover:text-amber-300">
              {t("viewAllPlans")} →
            </Link>
          </p>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-amber-400/20 bg-amber-400/5 p-8 text-center">
          <h2 className="font-heading text-2xl font-bold text-white">{t("ctaTitle")}</h2>
          <p className="mt-2 text-sm text-violet-200/70">{t("ctaSubtitle")}</p>
          <Link
            href="/login?callbackUrl=/dashboard"
            className="mt-6 inline-flex rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-8 py-3 text-sm font-bold text-[#0f1419] shadow-lg"
          >
            {t("startFree")}
          </Link>
        </div>
      </section>
    </>
  );
}
