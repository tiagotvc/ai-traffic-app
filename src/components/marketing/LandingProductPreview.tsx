import { getTranslations } from "next-intl/server";

import { MarketingDashboardShowcase } from "@/components/marketing/MarketingDashboardShowcase";

const FEATURES = ["sampleFeature1", "sampleFeature2", "sampleFeature3", "sampleFeature4"] as const;

export async function LandingProductPreview() {
  const t = await getTranslations("marketing");

  return (
    <section id="samples" className="marketing-section marketing-section-alt">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <p className="marketing-section-title">{t("sampleBadge")}</p>
          <h2 className="marketing-section-heading">{t("sampleTitle")}</h2>
          <p className="marketing-section-sub mx-auto max-w-2xl">{t("sampleSubtitle")}</p>
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="flex justify-center lg:justify-end">
            <MarketingDashboardShowcase />
          </div>

          <div className="space-y-4">
            <h3 className="font-heading text-lg font-semibold text-[var(--text-main)]">{t("samplePreviewTitle")}</h3>
            <p className="text-sm leading-relaxed text-[var(--text-dim)]">{t("samplePreviewBody")}</p>
            <ul className="space-y-3">
              {FEATURES.map((key) => (
                <li key={key} className="flex items-start gap-3 text-sm text-[var(--text-main)]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ui-accent)]" />
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
