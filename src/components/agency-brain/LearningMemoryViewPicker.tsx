"use client";

import { useTranslations } from "next-intl";

export type LearningMemoryViewId = "review" | "saved";

export function LearningMemoryViewPicker({
  selected,
  reviewCount,
  savedCount,
  onSelect
}: {
  selected: LearningMemoryViewId;
  reviewCount: number | null;
  savedCount: number | null;
  onSelect: (view: LearningMemoryViewId) => void;
}) {
  const t = useTranslations("agencyBrain");

  const options: {
    id: LearningMemoryViewId;
    labelKey: "memoryViewReview" | "memoryViewSaved";
    count: number | null;
  }[] = [
    { id: "review", labelKey: "memoryViewReview", count: reviewCount },
    { id: "saved", labelKey: "memoryViewSaved", count: savedCount }
  ];

  return (
    <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50/90 p-1">
      {options.map((opt) => {
        const active = selected === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(opt.id)}
            className={[
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              active
                ? opt.id === "review"
                  ? "bg-amber-100 text-amber-900 shadow-sm ring-1 ring-amber-200/80"
                  : "bg-emerald-100 text-emerald-900 shadow-sm ring-1 ring-emerald-200/80"
                : "text-slate-600 hover:bg-white hover:text-slate-800"
            ].join(" ")}
          >
            {t(opt.labelKey)}
            {opt.count != null ? (
              <span
                className={[
                  "min-w-[1.125rem] rounded-full px-1 py-px text-center text-[10px] font-bold tabular-nums",
                  active ? "bg-white/80" : "bg-slate-200/80 text-slate-600"
                ].join(" ")}
              >
                {opt.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
