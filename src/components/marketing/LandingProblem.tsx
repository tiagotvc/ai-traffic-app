"use client";

import { useTranslations } from "next-intl";

import { MarketingReveal } from "@/components/marketing/motion/MarketingReveal";
import { MarketingStagger, MarketingStaggerItem } from "@/components/marketing/motion/MarketingStagger";

const PROBLEM_ITEMS = ["problemItem1", "problemItem2", "problemItem3", "problemItem4", "problemItem5", "problemItem6"] as const;

export function LandingProblem() {
  const t = useTranslations("marketing");

  return (
    <section className="marketing-section marketing-section-alt">
      <div className="mx-auto max-w-6xl">
        <MarketingReveal>
          <p className="marketing-section-title">{t("problemBadge")}</p>
          <h2 className="marketing-section-heading">{t("problemTitle")}</h2>
          <p className="mt-4 max-w-3xl text-lg font-medium leading-relaxed text-[var(--text-main)] sm:text-xl">
            {t("problemSubtitle")}
          </p>
        </MarketingReveal>

        <MarketingStagger className="mt-10 grid gap-3 sm:grid-cols-2">
          {PROBLEM_ITEMS.map((key) => (
            <MarketingStaggerItem key={key}>
              <div className="marketing-card flex gap-3 p-4">
                <span className="font-heading text-xs font-bold text-[var(--ui-accent)]">
                  {String(PROBLEM_ITEMS.indexOf(key) + 1).padStart(2, "0")}
                </span>
                <p className="text-sm leading-relaxed text-[var(--text-dim)]">{t(key)}</p>
              </div>
            </MarketingStaggerItem>
          ))}
        </MarketingStagger>

        <MarketingReveal className="mt-8" delay={0.15}>
          <div className="marketing-card border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-dimmer)]">
              {t("problemSumLabel")}
            </p>
            <p className="mt-2 font-heading text-3xl font-bold text-[var(--ui-accent)]">{t("problemSumValue")}</p>
            <p className="mt-2 text-sm text-[var(--text-dim)]">{t("problemSumHint")}</p>
          </div>
        </MarketingReveal>
      </div>
    </section>
  );
}
