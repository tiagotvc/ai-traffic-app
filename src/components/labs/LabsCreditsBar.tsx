"use client";

import { useTranslations } from "next-intl";

import { SCIENTIST_CATALOG } from "@/lib/labs/scientist-catalog";

type LabsCreditsBarProps = {
  selectedScientists: string[];
  estimatedCredits: number;
  maxCredits?: number;
};

export function LabsCreditsBar({
  selectedScientists,
  estimatedCredits,
  maxCredits = 50
}: LabsCreditsBarProps) {
  const t = useTranslations("agencyBrain");
  const pct = Math.min(100, Math.round((estimatedCredits / maxCredits) * 100));

  return (
    <div className="rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50/80 via-white to-fuchsia-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-violet-600/80">
            {t("labsCreditsLabel")}
          </p>
          <p className="mt-0.5 text-sm text-slate-600">
            {t("labsScientistsCount", { count: selectedScientists.length })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums text-slate-900">
            {estimatedCredits}
            <span className="ml-1 text-sm font-medium text-slate-500">cr</span>
          </p>
          <p className="text-[11px] text-slate-500">{t("labsCreditsEstimated")}</p>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/70">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-orange-400 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {SCIENTIST_CATALOG.filter((s) => selectedScientists.includes(s.id)).map((entry) => (
          <span
            key={entry.id}
            className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${entry.gradient} px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm`}
          >
            {t(entry.nameKey)}
            <span className="opacity-80">+{entry.credits}</span>
          </span>
        ))}
        {selectedScientists.length === 0 && (
          <span className="text-xs text-slate-500">{t("labsScientistsNone")}</span>
        )}
      </div>
    </div>
  );
}
