"use client";

import { Bot, User } from "lucide-react";
import { useTranslations } from "next-intl";

import { MarketingReveal } from "@/components/marketing/motion/MarketingReveal";

const ORION_ITEMS = ["workSplitOrion1", "workSplitOrion2", "workSplitOrion3", "workSplitOrion4", "workSplitOrion5", "workSplitOrion6"] as const;
const YOU_ITEMS = ["workSplitYou1", "workSplitYou2", "workSplitYou3", "workSplitYou4"] as const;

export function LandingWorkSplit() {
  const t = useTranslations("marketing");

  return (
    <section className="marketing-section">
      <div className="mx-auto max-w-6xl">
        <MarketingReveal className="text-center">
          <p className="marketing-section-title">{t("workSplitBadge")}</p>
          <h2 className="marketing-section-heading">{t("workSplitTitle")}</h2>
          <p className="marketing-section-sub mx-auto max-w-2xl">{t("workSplitSubtitle")}</p>
        </MarketingReveal>

        <div className="mt-10 overflow-hidden rounded-2xl border border-[var(--border-color)]">
          <div className="h-2 bg-gradient-to-r from-[var(--ui-accent)] via-violet-400 to-[var(--ui-accent)] bg-[length:200%_100%] animate-[marketing-gradient-slide_4s_ease-in-out_infinite]" />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <MarketingReveal delay={0.05}>
            <div className="marketing-card h-full border-[var(--ui-accent-border)]">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
                  <Bot size={18} />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dimmer)]">
                    {t("workSplitOrionLabel")}
                  </p>
                  <p className="font-heading text-lg font-semibold text-[var(--text-main)]">{t("workSplitOrionTitle")}</p>
                </div>
              </div>
              <ul className="space-y-2">
                {ORION_ITEMS.map((key) => (
                  <li key={key} className="flex items-start gap-2 text-sm text-[var(--text-dim)]">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ui-accent)]" />
                    {t(key)}
                  </li>
                ))}
              </ul>
            </div>
          </MarketingReveal>

          <MarketingReveal delay={0.1}>
            <div className="marketing-card h-full">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-row-alt)] text-[var(--ui-accent)]">
                  <User size={18} />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dimmer)]">
                    {t("workSplitYouLabel")}
                  </p>
                  <p className="font-heading text-lg font-semibold text-[var(--text-main)]">{t("workSplitYouTitle")}</p>
                </div>
              </div>
              <ul className="space-y-2">
                {YOU_ITEMS.map((key) => (
                  <li key={key} className="flex items-start gap-2 text-sm text-[var(--text-dim)]">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--text-dimmer)]" />
                    {t(key)}
                  </li>
                ))}
              </ul>
            </div>
          </MarketingReveal>
        </div>

        <MarketingReveal className="mt-6 text-center" delay={0.15}>
          <p className="text-sm text-[var(--text-dim)]">{t("workSplitFootnote")}</p>
        </MarketingReveal>
      </div>
    </section>
  );
}
