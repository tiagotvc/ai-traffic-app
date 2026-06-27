import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

export async function LandingLegalStrip() {
  const t = await getTranslations("marketing");

  return (
    <section className="marketing-legal-strip" aria-label={t("legalStripLabel")}>
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--text-dim)]">{t("legalStripBody")}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Link href="/terms" className="font-medium text-[var(--ui-accent)] hover:underline">
            {t("navTerms")}
          </Link>
          <Link href="/privacy" className="font-medium text-[var(--ui-accent)] hover:underline">
            {t("navPrivacy")}
          </Link>
          <Link href="/data-deletion" className="font-medium text-[var(--ui-accent)] hover:underline">
            {t("navDataDeletion")}
          </Link>
        </div>
      </div>
    </section>
  );
}
