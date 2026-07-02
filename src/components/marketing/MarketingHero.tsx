"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

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
    <section className="marketing-hero relative overflow-hidden px-4 py-20 sm:px-6 sm:py-24 lg:py-28">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-950/55 via-[var(--surface-bg)] to-indigo-950/45" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, var(--text-main) 1px, transparent 0)",
          backgroundSize: "32px 32px"
        }}
      />
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-[28rem] w-[28rem] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(124,58,237,0.22) 0%, transparent 65%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(79,70,229,0.14) 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 70%)" }}
      />

      <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
        <motion.p className="marketing-badge" {...motionProps} transition={{ ...motionProps.transition, delay: 0.03 }}>
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--ui-accent)]" />
          {t("heroBadge")}
        </motion.p>

        <motion.h1
          className="mt-6 font-heading text-4xl font-bold leading-[1.05] tracking-tight text-[var(--text-main)] sm:text-6xl lg:text-7xl"
          {...motionProps}
          transition={{ ...motionProps.transition, delay: 0.05 }}
        >
          {t("heroTitlePrefix")}
          <span className="bg-gradient-to-r from-[var(--ui-accent)] to-violet-300 bg-clip-text text-transparent">
            {t("heroTitleHighlight")}
          </span>
          {t("heroTitleSuffix")}
        </motion.h1>

        <motion.p
          className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--text-dim)] sm:text-xl"
          {...motionProps}
          transition={{ ...motionProps.transition, delay: 0.1 }}
        >
          {t("heroSubtitle")}
        </motion.p>

        <motion.div
          className="mt-9 flex flex-wrap justify-center gap-3"
          {...motionProps}
          transition={{ ...motionProps.transition, delay: 0.15 }}
        >
          <Link href="/login?callbackUrl=/dashboard" className="marketing-cta-glow px-8 py-3.5 text-sm">
            {t("startFree")}
          </Link>
          <Link href="#product" className="ui-btn-secondary px-7 py-3.5 text-sm font-semibold">
            {t("heroProductCta")}
          </Link>
        </motion.div>
      </div>

      <MarketingStagger className="relative mx-auto mt-14 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {HERO_POINTS.map((key) => (
          <MarketingStaggerItem key={key}>
            <div className="marketing-card marketing-card-muted h-full p-4">
              <span className="font-heading text-xs font-bold text-[var(--ui-accent)]">
                {String(HERO_POINTS.indexOf(key) + 1).padStart(2, "0")}
              </span>
              <p className="mt-2 text-sm leading-snug text-[var(--text-main)]">{t(key)}</p>
            </div>
          </MarketingStaggerItem>
        ))}
      </MarketingStagger>
    </section>
  );
}
