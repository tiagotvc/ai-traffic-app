"use client";

import {
  BarChart3,
  Brain,
  FileText,
  Megaphone,
  Target,
  Users
} from "lucide-react";
import { useTranslations } from "next-intl";

import { MarketingReveal } from "@/components/marketing/motion/MarketingReveal";
import { MarketingStagger, MarketingStaggerItem } from "@/components/marketing/motion/MarketingStagger";
import { cn } from "@/lib/cn";

const CAPS = [
  { key: "cap1", icon: Target, featured: true },
  { key: "cap2", icon: BarChart3, featured: false },
  { key: "cap3", icon: Brain, featured: false },
  { key: "cap4", icon: Megaphone, featured: true },
  { key: "cap5", icon: FileText, featured: false },
  { key: "cap6", icon: Users, featured: false }
] as const;

export function LandingCapabilities() {
  const t = useTranslations("marketing");

  return (
    <section id="capabilities" className="marketing-section">
      <div className="mx-auto max-w-6xl">
        <MarketingReveal>
          <div className="max-w-2xl">
            <p className="marketing-section-title">{t("capBadge")}</p>
            <h2 className="marketing-section-heading">{t("capTitle")}</h2>
            <p className="marketing-section-sub">{t("capSubtitle")}</p>
          </div>
        </MarketingReveal>

        <MarketingStagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPS.map((cap) => {
            const { key, icon: Icon, featured } = cap;
            return (
              <MarketingStaggerItem key={key}>
                <article
                  className={cn(
                    "marketing-card group relative h-full transition hover:-translate-y-1",
                    featured && "border-[var(--ui-accent-border)] ring-1 ring-[var(--ui-accent-border)]"
                  )}
                >
                  {featured ? (
                    <span className="absolute -top-2.5 right-4 rounded-full bg-[var(--ui-accent)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--ui-accent-btn-text)]">
                      {t("capFeatured")}
                    </span>
                  ) : null}
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-4 font-heading text-base font-semibold text-[var(--text-main)]">
                    {t(`${key}Title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-dim)]">{t(`${key}Body`)}</p>
                  <p className="mt-3 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] px-3 py-2 text-xs leading-relaxed text-[var(--amber-bright)]">
                    {t(`${key}Example`)}
                  </p>
                </article>
              </MarketingStaggerItem>
            );
          })}
        </MarketingStagger>
      </div>
    </section>
  );
}
