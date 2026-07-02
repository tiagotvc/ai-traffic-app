import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { BillingPlansClient } from "@/components/billing/BillingPlansClient";
import { StackCostComparison } from "@/components/marketing/StackCostComparison";
import { buildAlternates } from "@/lib/seo";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("marketing");
  return {
    title: t("pricingMetaTitle"),
    description: t("pricingMetaDescription"),
    alternates: buildAlternates(locale, "/pricing")
  };
}

export default async function PricingPage() {
  const t = await getTranslations("marketing");

  return (
    <div className="pb-16">
      <div className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-4 pb-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--ui-accent)]">{t("pricingBadge")}</p>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {t("pricingTitle")}
          </h1>
          <p className="mx-auto max-w-xl text-sm text-violet-200/65">{t("pricingSubtitle")}</p>
        </div>
        <BillingPlansClient variant="marketing" />
      </div>

      <div className="border-t border-white/5 bg-[#0d1520] px-4 py-16 sm:px-6">
        <StackCostComparison />
      </div>
    </div>
  );
}
