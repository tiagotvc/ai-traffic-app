"use client";

import { useTranslations } from "next-intl";

import type { LearningsSubView } from "@/lib/agency-brain/insights/types";

const VIEWS: LearningsSubView[] = ["feed", "logs"];

export function LearningsViewTabs({
  selected,
  onSelect
}: {
  selected: LearningsSubView;
  onSelect: (view: LearningsSubView) => void;
}) {
  const t = useTranslations("brainInsights");

  return (
    <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
      {VIEWS.map((view) => {
        const active = selected === view;
        return (
          <button
            key={view}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(view)}
            className={[
              "rounded-md px-2.5 py-1 text-xs font-medium transition",
              active
                ? "bg-white text-violet-800 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            ].join(" ")}
          >
            {t(`learningsView.${view}`)}
          </button>
        );
      })}
    </div>
  );
}
