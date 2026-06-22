import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

const HERO_POINTS = ["heroPoint1", "heroPoint2", "heroPoint3", "heroPoint4"] as const;

export async function MarketingHero() {
  const t = await getTranslations("marketing");

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 px-4 py-16 sm:px-6 sm:py-24 lg:py-28">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px"
        }}
      />
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(245,166,35,0.15) 0%, transparent 65%)" }}
      />
      <div className="pointer-events-none absolute -bottom-32 left-0 h-80 w-80 rounded-full bg-violet-500/15 blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-violet-100 ring-1 ring-white/15">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          {t("heroBadge")}
        </p>

        <h1 className="max-w-4xl font-heading text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.25rem]">
          {t("heroTitlePrefix")}
          <span className="bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 bg-clip-text text-transparent">
            {t("heroTitleHighlight")}
          </span>
          {t("heroTitleSuffix")}
        </h1>

        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-violet-100/90">{t("heroSubtitle")}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login?callbackUrl=/dashboard"
            className="rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-3 text-sm font-bold text-[#0f1419] shadow-lg shadow-amber-500/25 transition hover:brightness-105"
          >
            {t("startFree")}
          </Link>
          <Link
            href="#compare"
            className="rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            {t("heroCompareCta")}
          </Link>
        </div>

        <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HERO_POINTS.map((key, i) => (
            <li
              key={key}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm"
            >
              <span className="font-heading text-xs font-bold text-amber-300/90">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="mt-2 text-sm leading-snug text-violet-50/95">{t(key)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
