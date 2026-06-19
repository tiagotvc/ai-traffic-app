"use client";

import { useTranslations } from "next-intl";

export function BrainFeedHeader() {
  const t = useTranslations("brainInsights");

  return (
    <header>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("feedTitle")}</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">{t("feedSubtitle")}</p>
    </header>
  );
}
