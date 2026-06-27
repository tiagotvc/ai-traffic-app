"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

import { MarketingDashboardShowcase } from "@/components/marketing/MarketingDashboardShowcase";
import { MarketingStagger, MarketingStaggerItem } from "@/components/marketing/motion/MarketingStagger";
import { useReducedMotion } from "@/components/marketing/motion/useReducedMotion";
import { Link } from "@/i18n/navigation";

const HERO_POINTS = ["heroPoint1", "heroPoint2", "heroPoint3", "heroPoint4"] as const;

export function MarketingHero() {
  const t = useTranslations("marketing");
  const reduced = useReducedMotion();

  const motionProps = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 20 } as const,
        animate: { opacity: 1, y: 0 } as const,
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const }
      };

  return (
    <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, var(--text-main) 1px, transparent 0)",
          backgroundSize: "32px 32px"
        }}
      />
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, var(--ui-accent-glow) 0%, transparent 65%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 left-0 h-80 w-80 rounded-full blur-3xl"
        style={{ background: "color-mix(in srgb, var(--ui-accent) 12%, transparent)" }}
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-12">
        <div>
          <motion.p className="marketing-badge" {...motionProps}>
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--amber-bright)]" />
            {t("heroBadge")}
          </motion.p>

          <motion.h1
            className="mt-4 max-w-xl font-heading text-4xl font-bold leading-[1.08] tracking-tight text-[var(--text-main)] sm:text-5xl lg:text-[3.25rem]"
            {...motionProps}
            transition={{ ...motionProps.transition, delay: 0.05 }}
          >
            {t("heroTitlePrefix")}
            <span className="bg-gradient-to-r from-[var(--ui-accent)] to-[var(--amber-bright)] bg-clip-text text-transparent">
              {t("heroTitleHighlight")}
            </span>
            {t("heroTitleSuffix")}
          </motion.h1>

          <motion.p
            className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--text-dim)]"
            {...motionProps}
            transition={{ ...motionProps.transition, delay: 0.1 }}
          >
            {t("heroSubtitle")}
          </motion.p>

          <motion.div
            className="mt-8 flex flex-wrap gap-3"
            {...motionProps}
            transition={{ ...motionProps.transition, delay: 0.15 }}
          >
            <Link href="/login?callbackUrl=/dashboard" className="ui-btn-accent px-6 py-3 text-sm font-semibold">
              {t("startFree")}
            </Link>
            <Link href="#product" className="ui-btn-secondary px-6 py-3 text-sm font-semibold">
              {t("heroProductCta")}
            </Link>
          </motion.div>

          <MarketingStagger className="mt-10 grid gap-3 sm:grid-cols-2">
            {HERO_POINTS.map((key) => (
              <MarketingStaggerItem key={key}>
                <div className="marketing-card marketing-card-muted p-4">
                  <span className="font-heading text-xs font-bold text-[var(--amber-bright)]">
                    {String(HERO_POINTS.indexOf(key) + 1).padStart(2, "0")}
                  </span>
                  <p className="mt-2 text-sm leading-snug text-[var(--text-main)]">{t(key)}</p>
                </div>
              </MarketingStaggerItem>
            ))}
          </MarketingStagger>
        </div>

        <motion.div
          className="marketing-float flex justify-center lg:justify-end"
          {...(reduced
            ? {}
            : {
                initial: { opacity: 0, x: 40 },
                animate: { opacity: 1, x: 0 },
                transition: { duration: 0.65, delay: 0.2, ease: [0.22, 1, 0.36, 1] }
              })}
        >
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-card)] p-3 shadow-2xl shadow-black/30 ring-1 ring-[var(--ui-accent-border)]">
            <MarketingDashboardShowcase />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
