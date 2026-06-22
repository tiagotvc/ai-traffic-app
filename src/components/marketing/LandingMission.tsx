import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

export async function LandingMission() {
  const t = await getTranslations("marketing");

  return (
    <section className="border-b border-white/5 px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-300/80">{t("missionBadge")}</p>
            <h2 className="mt-2 font-heading text-2xl font-bold text-white sm:text-3xl">{t("missionTitle")}</h2>
            <p className="mt-4 text-sm leading-relaxed text-violet-200/75">{t("missionBody")}</p>
            <p className="mt-3 text-sm font-medium text-amber-200/90">{t("missionHighlight")}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(["missionStat1", "missionStat2", "missionStat3", "missionStat4"] as const).map((key) => (
              <div
                key={key}
                className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center"
              >
                <div className="font-heading text-2xl font-bold text-amber-300">{t(`${key}Value`)}</div>
                <div className="mt-1 text-[11px] leading-snug text-violet-200/65">{t(`${key}Label`)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export async function LandingCta() {
  const t = await getTranslations("marketing");

  return (
    <section className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-500/10 via-violet-950/40 to-indigo-950/40 p-8 text-center sm:p-10">
        <h2 className="font-heading text-2xl font-bold text-white sm:text-3xl">{t("ctaTitle")}</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-violet-200/75">{t("ctaSubtitle")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/login?callbackUrl=/dashboard"
            className="rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-8 py-3 text-sm font-bold text-[#0f1419] shadow-lg shadow-amber-500/25 transition hover:brightness-105"
          >
            {t("startFree")}
          </Link>
          <Link
            href="/pricing"
            className="rounded-xl border border-white/20 bg-white/5 px-8 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            {t("viewPricing")}
          </Link>
        </div>
      </div>
    </section>
  );
}
