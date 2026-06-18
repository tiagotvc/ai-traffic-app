"use client";

import { useTranslations } from "next-intl";

export function LabsComingSoon() {
  const t = useTranslations("agencyBrain");

  return (
    <div className="ui-card mx-auto max-w-lg p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-violet-600">
        {t("labsComingSoonBadge")}
      </p>
      <h2 className="mt-2 text-xl font-bold text-slate-900">{t("labsComingSoonTitle")}</h2>
      <p className="mt-2 text-sm text-slate-600">{t("labsComingSoonBody")}</p>
    </div>
  );
}
