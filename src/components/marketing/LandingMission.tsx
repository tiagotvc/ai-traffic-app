import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

export async function LandingMission() {
  const t = await getTranslations("marketing");

  return (
    <section className="marketing-section marketing-section-alt">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="marketing-section-title">{t("missionBadge")}</p>
            <h2 className="marketing-section-heading">{t("missionTitle")}</h2>
            <p className="marketing-section-sub">{t("missionBody")}</p>
            <p className="mt-3 text-sm font-medium text-[var(--ui-accent)]">{t("missionHighlight")}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(["missionStat1", "missionStat2", "missionStat3", "missionStat4"] as const).map((key) => (
              <div
                key={key}
                className="marketing-card p-4 text-center"
              >
                <div className="font-heading text-2xl font-bold text-[var(--ui-accent)]">{t(`${key}Value`)}</div>
                <div className="mt-1 text-[11px] leading-snug text-[var(--text-dim)]">{t(`${key}Label`)}</div>
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
    <section className="marketing-section px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] p-8 text-center sm:p-10">
        <h2 className="font-heading text-2xl font-bold text-[var(--text-main)] sm:text-3xl">{t("ctaTitle")}</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[var(--text-dim)]">{t("ctaSubtitle")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/login?callbackUrl=/dashboard" className="marketing-cta-glow px-8 py-3 text-sm">
            {t("startFree")}
          </Link>
          <Link href="/#pricing" className="ui-btn-secondary px-8 py-3 text-sm font-semibold">
            {t("viewPricing")}
          </Link>
        </div>
      </div>
    </section>
  );
}
