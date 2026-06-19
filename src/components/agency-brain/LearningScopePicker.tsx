"use client";

import { useTranslations } from "next-intl";

import { LEARNING_SCOPE_CATALOG } from "@/lib/agency-brain/learning-scope-catalog";
import type { LearningScopeId } from "@/lib/agency-brain/learning-scopes";

function ScopeIcon({ path, className }: { path: string; className?: string }) {
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

type LearningScopePickerProps = {
  selected: LearningScopeId;
  counts?: Partial<Record<LearningScopeId, number | null>>;
  onSelect: (scopeId: LearningScopeId) => void;
  compact?: boolean;
};

export function LearningScopePicker({
  selected,
  counts,
  onSelect,
  compact = false
}: LearningScopePickerProps) {
  const t = useTranslations("agencyBrain");

  return (
    <div
      className={
        compact
          ? "min-w-0 flex-1"
          : "rounded-xl border border-slate-200/90 bg-gradient-to-r from-white/80 to-slate-50/50 px-3 py-2.5"
      }
    >
      {!compact ? (
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-[11px] font-medium text-slate-600">{t("learningScopeTitle")}</p>
          <p className="text-[10px] text-slate-400">{t("learningScopeSubtitle")}</p>
        </div>
      ) : null}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {LEARNING_SCOPE_CATALOG.map((entry) => {
          const isActive = selected === entry.id;
          const count = counts?.[entry.id];
          const label = t(entry.labelKey as "learningScopeClient");
          const hint = t(entry.hintKey as "learningScopeClientHint");

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
                    : "text-slate-600 hover:bg-white hover:text-slate-800"
                ].join(" ")}
              >
                <ScopeIcon
                  path={entry.iconPath}
                  className={[
                    "h-3.5 w-3.5 shrink-0",
                    isActive ? "opacity-90" : "text-slate-400 group-hover:text-slate-500"
                  ].join(" ")}
                />
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
                  "pointer-events-none absolute bottom-[calc(100%+4px)] left-1/2 z-20 w-48 -translate-x-1/2",
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
