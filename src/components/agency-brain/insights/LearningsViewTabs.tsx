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
    <div className="flex gap-1 rounded-lg bg-[var(--surface-thead)] p-0.5">
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
                ? "bg-white text-[var(--violet)] shadow-sm"
                : "text-[var(--text-dim)] hover:text-[var(--text-main)]"
            ].join(" ")}
          >
            {t(`learningsView.${view}`)}
          </button>
        );
      })}
    </div>
  );
}
