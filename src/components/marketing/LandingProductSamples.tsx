"use client";

import { useTranslations } from "next-intl";

import { MarketingReveal } from "@/components/marketing/motion/MarketingReveal";
import { cn } from "@/lib/cn";

const SHOTS = [
  { src: "/examples/dashboard.png", titleKey: "shot1Title", descKey: "shot1Desc" },
  { src: "/examples/manual_or_ia.png", titleKey: "shot2Title", descKey: "shot2Desc" },
  { src: "/examples/simple_and_intuitive.png", titleKey: "shot3Title", descKey: "shot3Desc" }
] as const;

export function LandingProductSamples() {
  const t = useTranslations("marketing");

  return (
    <section id="product" className="marketing-section marketing-section-alt">
      <div className="mx-auto max-w-6xl">
        <MarketingReveal className="mb-12 text-center">
          <p className="marketing-section-title">{t("sampleBadge")}</p>
          <h2 className="marketing-section-heading">{t("sampleTitle")}</h2>
          <p className="marketing-section-sub mx-auto max-w-2xl">{t("sampleSubtitle")}</p>
        </MarketingReveal>

        <div className="space-y-16 lg:space-y-24">
          {SHOTS.map((shot, i) => (
            <MarketingReveal key={shot.src}>
              <div
                className={cn(
                  "grid items-center gap-8 lg:grid-cols-2 lg:gap-12",
                  i % 2 === 1 && "lg:[&>*:first-child]:order-2"
                )}
              >
                <div>
                  <h3 className="font-heading text-2xl font-bold leading-tight tracking-tight text-[var(--text-main)] sm:text-3xl">
                    {t(shot.titleKey)}
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-[var(--text-dim)]">
                    {t(shot.descKey)}
                  </p>
                </div>
                <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-card)] p-2 shadow-2xl shadow-black/30 ring-1 ring-[var(--ui-accent-border)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={shot.src}
                    alt={t(shot.titleKey)}
                    className="block w-full rounded-xl"
                    loading="lazy"
                  />
                </div>
              </div>
            </MarketingReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
