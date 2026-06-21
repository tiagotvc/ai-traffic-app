import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

const FEATURE_KEYS = ["feature1", "feature2", "feature3", "feature4"] as const;

export async function MarketingHero() {
  const t = await getTranslations("marketing");
  const tAuth = await getTranslations("auth");

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-violet-950 via-violet-900 to-indigo-950 px-4 py-16 sm:px-6 sm:py-24 lg:py-28">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px"
        }}
      />
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        <p className="mb-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-violet-100 ring-1 ring-white/15">
          {tAuth("heroBadge")}
        </p>
        <h1 className="max-w-3xl font-heading text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
          {tAuth("heroTitle")}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-violet-100/90">{tAuth("heroSubtitle")}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login?callbackUrl=/dashboard"
            className="rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-3 text-sm font-bold text-[#0f1419] shadow-lg shadow-amber-500/25 transition hover:brightness-105"
          >
            {t("startFree")}
          </Link>
          <Link
            href="/pricing"
            className="rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            {t("viewPricing")}
          </Link>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURE_KEYS.map((key, i) => (
            <li
              key={key}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
            >
              <span className="text-xs font-bold text-amber-300/90">0{i + 1}</span>
              <p className="mt-2 text-sm leading-snug text-violet-50/95">{t(key)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
