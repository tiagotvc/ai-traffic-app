"use client";

import { useTranslations } from "next-intl";

import { MarketingReveal } from "@/components/marketing/motion/MarketingReveal";
import { MarketingDemoVideo } from "@/components/marketing/MarketingDemoVideo";

const RANKING_POSTER = "/examples/lp/criativos.webp";
const RANKING_VIDEO = "/examples/lp/criativos.mp4";
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
              <MarketingDemoVideo
                src={RANKING_VIDEO}
                poster={RANKING_POSTER}
                alt={t("creativeRankingImageAlt")}
                className="aspect-video w-full overflow-hidden rounded-xl"
              />
            </div>
          </MarketingReveal>
        </div>
      </div>
    </section>
  );
}
