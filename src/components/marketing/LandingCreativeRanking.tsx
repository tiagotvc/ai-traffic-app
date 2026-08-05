"use client";

import { useTranslations } from "next-intl";

import { MarketingReveal } from "@/components/marketing/motion/MarketingReveal";

const RANKING_SRC = "/examples/creative-ranking.jpg";
const RANKING_POINTS = ["creativeRankingPoint1", "creativeRankingPoint2", "creativeRankingPoint3"] as const;

export function LandingCreativeRanking() {
  const t = useTranslations("marketing");

  return (
    <section className="marketing-section">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_0.85fr] lg:gap-14">
          <MarketingReveal>
            <p className="marketing-section-title">{t("creativeRankingBadge")}</p>
            <h2 className="mt-2 font-heading text-2xl font-bold leading-tight tracking-tight text-balance text-[var(--text-main)] sm:text-3xl">
              {t("creativeRankingTitle")}
            </h2>
            <p className="mt-4 text-lg font-medium leading-relaxed text-[var(--text-dim)]">
              {t("creativeRankingSubtitle")}
            </p>

            <ul className="mt-8 space-y-3">
              {RANKING_POINTS.map((key) => (
                <li key={key} className="flex items-start gap-3 text-sm text-[var(--text-main)]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ui-accent)]" />
                  {t(key)}
                </li>
              ))}
            </ul>
          </MarketingReveal>

          <MarketingReveal delay={0.1}>
            <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-card)] p-2 shadow-lg shadow-black/20 ring-1 ring-[var(--ui-accent-border)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={RANKING_SRC}
                alt={t("creativeRankingImageAlt")}
                className="block w-full rounded-xl"
                loading="lazy"
              />
            </div>
          </MarketingReveal>
        </div>
      </div>
    </section>
  );
}
