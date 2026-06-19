"use client";

import { useTranslations } from "next-intl";

export type LearningContentFilterId = "learnings" | "patterns";

export function LearningContentFilter({
  selected,
  onSelect
}: {
  selected: LearningContentFilterId;
  onSelect: (id: LearningContentFilterId) => void;
}) {
  const t = useTranslations("agencyBrain");

  const options: { id: LearningContentFilterId; labelKey: "contentFilterLearnings" | "contentFilterPatterns" }[] =
    [
      { id: "learnings", labelKey: "contentFilterLearnings" },
      { id: "patterns", labelKey: "contentFilterPatterns" }
    ];

  return (
    <div className="flex shrink-0 gap-1 rounded-lg border border-slate-200 bg-slate-50/80 p-0.5">
      {options.map((opt) => {
        const active = selected === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            aria-pressed={active}
            className={[
              "rounded-md px-2.5 py-1 text-[11px] font-medium transition",
              active
                ? "bg-white text-violet-800 shadow-sm ring-1 ring-violet-100"
                : "text-slate-600 hover:text-slate-800"
            ].join(" ")}
          >
            {t(opt.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
