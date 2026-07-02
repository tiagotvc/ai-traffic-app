import { getTranslations } from "next-intl/server";

import { LandingSystemShowcase } from "@/components/marketing/LandingSystemShowcase";
import { MarketingReveal } from "@/components/marketing/motion/MarketingReveal";

const DASH_POINTS = ["dashSectionPoint1", "dashSectionPoint2", "dashSectionPoint3"] as const;

export async function LandingDashboardSection() {
  const t = await getTranslations("marketing");

  return (
    <section id="dashboard" className="marketing-section relative overflow-hidden">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-72 w-[44rem] max-w-full -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 70%)" }}
      />

      <div className="relative mx-auto max-w-6xl">
        <MarketingReveal className="mx-auto max-w-3xl text-center">
          <p className="marketing-section-title">{t("dashSectionBadge")}</p>
          <h2 className="marketing-section-heading">{t("dashSectionTitle")}</h2>
          <p className="marketing-section-sub mx-auto max-w-2xl">{t("dashSectionSubtitle")}</p>
        </MarketingReveal>

        <MarketingReveal
          delay={0.1}
          className="mx-auto mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
        >
          {DASH_POINTS.map((key) => (
            <span key={key} className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-main)]">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ui-accent)]" />
              {t(key)}
            </span>
          ))}
        </MarketingReveal>

        <MarketingReveal delay={0.15} className="mt-10">
          <LandingSystemShowcase />
        </MarketingReveal>
      </div>
    </section>
  );
}
