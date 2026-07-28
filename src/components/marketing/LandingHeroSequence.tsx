"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

import { LaptopMockup } from "@/components/marketing/LaptopMockup";
import { MarketingReveal } from "@/components/marketing/motion/MarketingReveal";
import { useReducedMotion } from "@/components/marketing/motion/useReducedMotion";
import { Link } from "@/i18n/navigation";

const DASH_POINTS = ["dashSectionPoint1", "dashSectionPoint2", "dashSectionPoint3"] as const;
const DASHBOARD_SRC = "/examples/dashboard.png";

type T = ReturnType<typeof useTranslations>;

/** Subtle star field — pure CSS (no external asset / no license). */
const STARFIELD =
  "radial-gradient(1.5px 1.5px at 40px 60px, rgba(255,255,255,0.55), transparent)," +
  "radial-gradient(1px 1px at 130px 30px, rgba(255,255,255,0.4), transparent)," +
  "radial-gradient(1px 1px at 220px 95px, rgba(255,255,255,0.45), transparent)," +
  "radial-gradient(1.5px 1.5px at 90px 160px, rgba(206,196,255,0.5), transparent)," +
  "radial-gradient(1px 1px at 265px 205px, rgba(255,255,255,0.32), transparent)," +
  "radial-gradient(1px 1px at 30px 250px, rgba(255,255,255,0.4), transparent)," +
  "radial-gradient(1.5px 1.5px at 185px 285px, rgba(255,255,255,0.28), transparent)";

function Starfield({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <div className="absolute inset-0 opacity-70" style={{ backgroundImage: STARFIELD, backgroundSize: "320px 320px" }} />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to bottom, transparent 55%, var(--surface-bg))" }}
      />
    </div>
  );
}

export function LandingHeroSequence() {
  const t = useTranslations("marketing");
  const reduced = useReducedMotion();

  const rise = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 24 } as const,
          animate: { opacity: 1, y: 0 } as const,
          transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const, delay }
        };

  return (
    <>
      <section className="marketing-hero relative overflow-hidden px-4 py-20 sm:px-6 sm:py-24 lg:py-28">
        <Starfield className="pointer-events-none absolute inset-0" />

        <div className="relative mx-auto max-w-3xl text-center">
          <motion.h1
            className="text-balance font-heading text-4xl font-bold leading-[1.05] tracking-tight text-[var(--text-main)] sm:text-5xl lg:text-6xl"
            {...rise(0.04)}
          >
            {t("heroTitlePrefix")}
            <span className="text-[var(--ui-accent)]">{t("heroTitleHighlight")}</span>
            {t("heroTitleSuffix")}
          </motion.h1>

          <motion.p
            className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-[var(--text-dim)]"
            {...rise(0.12)}
          >
            {t("heroSubtitle")}
          </motion.p>

          <motion.div className="mt-8 flex flex-wrap justify-center gap-3" {...rise(0.18)}>
            <Link href="/login?callbackUrl=/dashboard" className="ui-btn-accent px-7 py-3.5 text-sm font-semibold">
              {t("startFree")}
            </Link>
            <Link href="#product" className="ui-btn-secondary px-7 py-3.5 text-sm font-semibold">
              {t("heroProductCta")}
            </Link>
          </motion.div>
        </div>

        <motion.div
          className="relative mx-auto mt-14 max-w-2xl"
          initial={reduced ? undefined : { opacity: 0, y: 32, scale: 0.97 }}
          animate={reduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
          transition={reduced ? undefined : { duration: 0.75, ease: [0.22, 1, 0.36, 1], delay: 0.28 }}
        >
          <LaptopMockup src={DASHBOARD_SRC} alt={t("heroDashboardAlt")} />
        </motion.div>
      </section>

      <DashboardSection t={t} />
    </>
  );
}

function DashboardSection({ t }: { t: T }) {
  return (
    <section id="dashboard" className="marketing-section relative overflow-hidden">
      <div className="relative mx-auto max-w-6xl">
        <MarketingReveal className="mx-auto max-w-3xl text-center">
          <p className="marketing-section-title">{t("dashSectionBadge")}</p>
          <h2 className="marketing-section-heading">{t("dashSectionTitle")}</h2>
          <p className="marketing-section-sub mx-auto max-w-2xl">{t("dashSectionSubtitle")}</p>
        </MarketingReveal>

        <MarketingReveal delay={0.1} className="mx-auto mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {DASH_POINTS.map((key) => (
            <span key={key} className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-main)]">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ui-accent)]" />
              {t(key)}
            </span>
          ))}
        </MarketingReveal>

        <MarketingReveal delay={0.15} className="mt-10">
          <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-card)] p-2 shadow-lg shadow-black/20 ring-1 ring-[var(--ui-accent-border)] sm:p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={DASHBOARD_SRC} alt={t("heroDashboardAlt")} className="block w-full rounded-xl" />
          </div>
        </MarketingReveal>
      </div>
    </section>
  );
}
