"use client";

import { useTranslations } from "next-intl";

export function BrainFeedHeader() {
  const t = useTranslations("brainInsights");

  return (
    <header>
      <h1 className="font-heading font-heading text-2xl font-bold tracking-tight text-[var(--text-main)]">{t("feedTitle")}</h1>
      <p className="mt-1 max-w-2xl text-sm text-[var(--text-dim)]">{t("feedSubtitle")}</p>
    </header>
  );
}
