"use client";

import { Link2, Settings, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { MarketingReveal } from "@/components/marketing/motion/MarketingReveal";
import { MarketingStagger, MarketingStaggerItem } from "@/components/marketing/motion/MarketingStagger";

const STEPS = [
  { key: "howStep1", icon: Link2 },
  { key: "howStep2", icon: Settings },
  { key: "howStep3", icon: Sparkles }
] as const;

export function LandingHowItWorks() {
  const t = useTranslations("marketing");

  return (
    <section id="how-it-works" className="marketing-section marketing-section-alt">
      <div className="mx-auto max-w-6xl">
        <MarketingReveal className="text-center">
          <p className="marketing-section-title">{t("howItWorksBadge")}</p>
          <h2 className="marketing-section-heading">{t("howItWorksTitle")}</h2>
          <p className="marketing-section-sub mx-auto max-w-2xl">{t("howItWorksSubtitle")}</p>
        </MarketingReveal>

        <MarketingStagger className="relative mt-12 grid gap-6 md:grid-cols-3">
          <div
            className="pointer-events-none absolute left-[16%] right-[16%] top-10 hidden h-px bg-gradient-to-r from-transparent via-[var(--ui-accent-border)] to-transparent md:block"
            aria-hidden
          />
          {STEPS.map(({ key, icon: Icon }, i) => (
            <MarketingStaggerItem key={key}>
              <div className="marketing-card relative h-full text-center">
                <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--ui-accent-muted)] font-heading text-sm font-bold text-[var(--ui-accent)] ring-1 ring-[var(--ui-accent-border)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Icon className="mx-auto mb-3 h-5 w-5 text-[var(--ui-accent)]" />
                <h3 className="font-heading text-base font-semibold text-[var(--text-main)]">{t(`${key}Title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-dim)]">{t(`${key}Body`)}</p>
                <p className="mt-3 text-xs font-medium text-[var(--ui-accent)]">{t(`${key}Hint`)}</p>
              </div>
            </MarketingStaggerItem>
          ))}
        </MarketingStagger>
      </div>
    </section>
  );
}
