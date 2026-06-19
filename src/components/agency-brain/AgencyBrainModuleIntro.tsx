"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

import type { AgencyBrainMvpModuleId } from "@/lib/agency-brain/domain/mvp";

const MODULE_NAV_KEYS: Record<AgencyBrainMvpModuleId, string> = {
  learnings: "agencyBrainLearnings",
  hypotheses: "agencyBrainHypotheses",
  dna: "agencyBrainDna",
  suggestions: "agencyBrainActionCenter"
};

const MODULE_ROUTES: Record<AgencyBrainMvpModuleId, string> = {
  learnings: "/agency-brain/learnings",
  hypotheses: "/agency-brain/hypotheses",
  dna: "/agency-brain/dna",
  suggestions: "/agency-brain/suggestions"
};

const MODULE_RELATED: Record<AgencyBrainMvpModuleId, AgencyBrainMvpModuleId[]> = {
  learnings: ["hypotheses", "dna", "suggestions"],
  hypotheses: ["learnings", "dna", "suggestions"],
  dna: ["learnings", "hypotheses", "suggestions"],
  suggestions: ["learnings", "hypotheses", "dna"]
};

export function AgencyBrainModuleIntro({
  moduleId,
  compact = false
}: {
  moduleId: AgencyBrainMvpModuleId;
  compact?: boolean;
}) {
  const t = useTranslations("agencyBrain");
  const tNav = useTranslations("nav");

  const related = MODULE_RELATED[moduleId];

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
        <span className="text-[11px] font-medium text-slate-500">{t("mvp_related")}</span>
        {related.map((id) => (
          <Link
            key={id}
            href={MODULE_ROUTES[id]}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-slate-600 transition hover:border-violet-200 hover:text-violet-700"
          >
            {tNav(MODULE_NAV_KEYS[id])}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/90 via-white to-white px-4 py-3 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">{t(`mvp_${moduleId}_title`)}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{t(`mvp_${moduleId}_hint`)}</p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {related.map((id) => (
          <Link
            key={id}
            href={MODULE_ROUTES[id]}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-slate-600 transition hover:border-violet-200 hover:text-violet-700"
          >
            {tNav(MODULE_NAV_KEYS[id])}
          </Link>
        ))}
      </div>
    </div>
  );
}
