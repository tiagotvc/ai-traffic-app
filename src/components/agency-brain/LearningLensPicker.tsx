"use client";

import { useTranslations } from "next-intl";

import {
  LEARNING_LENS_CATALOG,
  countForLens,
  type LearningLensId
} from "@/lib/agency-brain/learning-lens-catalog";
import type { BrainSummary } from "@/lib/agency-brain/types";

function LensIcon({ path, className }: { path: string; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
}

type LearningLensPickerProps = {
  selected: LearningLensId;
  summary: BrainSummary | null;
  onSelect: (lensId: LearningLensId) => void;
  hidePending?: boolean;
  compact?: boolean;
  primaryOnly?: boolean;
};

export function LearningLensPicker({
  selected,
  summary,
  onSelect,
  hidePending = false,
  compact = false,
  primaryOnly = true
}: LearningLensPickerProps) {
  const t = useTranslations("agencyBrain");

  const catalog = LEARNING_LENS_CATALOG.filter((entry) => {
    if (hidePending && entry.id === "PENDING") return false;
    if (primaryOnly) {
      return (
        entry.id === "ALL" ||
        entry.id === "HIGH_IMPACT" ||
        entry.id === "CREATIVE" ||
        entry.id === "AUDIENCE" ||
        entry.id === "OFFER"
      );
    }
    return true;
  });

  return (
    <div
      className={
        compact
          ? "min-w-0"
          : "rounded-xl border border-slate-200/90 bg-white/60 px-3 py-2.5"
      }
    >
      {!compact ? (
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-[11px] font-medium text-slate-600">{t("learningLensTitle")}</p>
          <p className="text-[10px] text-slate-400">{t("learningLensSubtitle")}</p>
        </div>
      ) : null}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {catalog.filter((entry) => !(hidePending && entry.id === "PENDING")).map((entry) => {
          const isActive = selected === entry.id;
          const count = countForLens(entry.id, summary);
          const label = entry.labelKey.startsWith("category.")
            ? t(entry.labelKey as "category.CREATIVE")
            : t(entry.labelKey as "learningLensAll");
          const hint = t(entry.hintKey as "learningLensAllHint");

          return (
            <div key={entry.id} className="group relative shrink-0">
              <button
                type="button"
                onClick={() => onSelect(entry.id)}
                aria-pressed={isActive}
                aria-label={`${label}. ${hint}`}
                className={[
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left transition-all duration-150",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-1",
                  isActive
                    ? `${entry.activeBg} ${entry.activeText} shadow-sm ring-1 ring-slate-200/80`
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                    entry.iconBg,
                    entry.animated ? "animate-high-impact-pulse" : ""
                  ].join(" ")}
                >
                  <LensIcon path={entry.iconPath} className={`h-3.5 w-3.5 ${entry.iconColor}`} />
                </span>
                <span className="whitespace-nowrap text-[11px] font-medium">{label}</span>
                {count != null ? (
                  <span
                    className={[
                      "min-w-[1.125rem] rounded-full px-1 py-px text-center text-[9px] font-semibold tabular-nums",
                      isActive ? "bg-white/70 text-inherit" : "bg-slate-100 text-slate-500"
                    ].join(" ")}
                  >
                    {count}
                  </span>
                ) : null}
              </button>

              <div
                role="tooltip"
                className={[
                  "pointer-events-none absolute bottom-[calc(100%+4px)] left-1/2 z-20 w-44 -translate-x-1/2",
                  "rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[10px] leading-snug text-slate-600 shadow-md",
                  "opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                  "before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-white"
                ].join(" ")}
              >
                {hint}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
