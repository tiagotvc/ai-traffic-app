"use client";

import { useTranslations } from "next-intl";

import type { AgencyBrainModule } from "@/lib/agency-brain/domain/modules";

const COMING_SOON_MODULES = new Set<AgencyBrainModule>([
  "timeline",
  "action-plans",
  "chat",
  "labs"
]);

export function AgencyBrainComingSoon({ moduleId }: { moduleId: AgencyBrainModule }) {
  const t = useTranslations("agencyBrain");

  if (!COMING_SOON_MODULES.has(moduleId)) return null;

  return (
    <div className="ui-card mx-auto max-w-lg p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
          />
        </svg>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-violet-600">
        {t("comingSoonBadge")}
      </p>
      <h2 className="mt-2 text-xl font-bold text-slate-900">{t(`comingSoon_${moduleId}_title`)}</h2>
      <p className="mt-2 text-sm text-slate-600">{t(`comingSoon_${moduleId}_body`)}</p>
      <p className="mt-4 text-xs text-slate-400">{t("comingSoonMvpHint")}</p>
    </div>
  );
}
