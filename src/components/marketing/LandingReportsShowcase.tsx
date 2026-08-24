"use client";

import { useTranslations } from "next-intl";

import { MarketingDemoVideo } from "@/components/marketing/MarketingDemoVideo";
import { MarketingReveal } from "@/components/marketing/motion/MarketingReveal";

export function LandingReportsShowcase() {
  const t = useTranslations("marketing");

  return (
    <section className="marketing-section marketing-section-alt">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
        <MarketingReveal delay={0.1}>
          <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-card)] p-2 shadow-lg shadow-black/20 ring-1 ring-[var(--ui-accent-border)]">
            <MarketingDemoVideo
              src="/examples/lp/relatorios.mp4"
              poster="/examples/lp/relatorios.webp"
              alt={t("reportsShowcaseAlt")}
              className="aspect-video w-full overflow-hidden rounded-xl"
            />
          </div>
        </MarketingReveal>

        <MarketingReveal>
          <p className="marketing-section-title">{t("reportsShowcaseBadge")}</p>
          <h2 className="mt-2 text-balance font-heading text-2xl font-bold leading-tight tracking-tight text-[var(--text-main)] sm:text-3xl">
            {t("reportsShowcaseTitle")}
          </h2>
          <p className="mt-4 text-lg font-medium leading-relaxed text-[var(--text-dim)]">
            {t("reportsShowcaseSubtitle")}
          </p>
        </MarketingReveal>
      </div>
    </section>
  );
}
