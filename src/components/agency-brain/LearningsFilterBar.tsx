"use client";

import { useTranslations } from "next-intl";

import type { LearningCategory } from "@/lib/agency-brain/types";
import type { LearningScopeId } from "@/lib/agency-brain/learning-scopes";

export type FeedViewId = "insights" | "memory";

export type CategoryChipId = "ALL" | LearningCategory;

const CATEGORY_CHIPS: CategoryChipId[] = [
  "ALL",
  "CREATIVE",
  "AUDIENCE",
  "OFFER",
  "COPY",
  "LANDING_PAGE",
  "SEASONALITY"
];

type LearningsFilterBarProps = {
  scope: LearningScopeId;
  onScopeChange: (scope: LearningScopeId) => void;
  feedView: FeedViewId;
  onFeedViewChange: (view: FeedViewId) => void;
  categoryChip: CategoryChipId;
  onCategoryChipChange: (chip: CategoryChipId) => void;
  search: string;
  onSearchChange: (value: string) => void;
  advancedOpen: boolean;
  onAdvancedToggle: () => void;
  advancedActiveCount: number;
  showFeedControls: boolean;
};

export function LearningsFilterBar({
  scope,
  onScopeChange,
  feedView,
  onFeedViewChange,
  categoryChip,
  onCategoryChipChange,
  search,
  onSearchChange,
  advancedOpen,
  onAdvancedToggle,
  advancedActiveCount,
  showFeedControls
}: LearningsFilterBarProps) {
  const t = useTranslations("agencyBrain");

  const memoryLayers: { id: LearningScopeId; labelKey: "filterScopeClient" | "filterScopeAgency" | "filterScopeMarket" }[] =
    [
      { id: "client", labelKey: "filterScopeClient" },
      { id: "agency", labelKey: "filterScopeAgency" },
      { id: "market", labelKey: "filterScopeMarket" }
    ];

  function categoryLabel(chip: CategoryChipId): string {
    if (chip === "ALL") return t("learningLensAll");
    return t(`category.${chip}`);
  }

  return (
    <div className="min-w-0 space-y-3">
      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {t("filterMemoryLayerTitle")}
        </p>
        <div className="flex flex-wrap gap-3">
          {memoryLayers.map((layer) => {
            const active = scope === layer.id;
            return (
              <label
                key={layer.id}
                className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-slate-700"
              >
                <input
                  type="radio"
                  name="memory-layer"
                  className="h-3.5 w-3.5 border-slate-300 text-violet-600 focus:ring-violet-500"
                  checked={active}
                  onChange={() => onScopeChange(layer.id)}
                />
                <span className={active ? "font-semibold text-slate-900" : ""}>
                  {t(layer.labelKey)}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {showFeedControls ? (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {t("filterFeedViewLabel")}
              </p>
              <div className="flex gap-1 rounded-lg border border-slate-200/80 p-0.5">
                {(["insights", "memory"] as FeedViewId[]).map((view) => {
                  const active = feedView === view;
                  return (
                    <button
                      key={view}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onFeedViewChange(view)}
                      className={[
                        "rounded-md px-3 py-1 text-xs font-semibold transition",
                        active
                          ? view === "insights"
                            ? "bg-amber-100 text-amber-900"
                            : "bg-emerald-100 text-emerald-900"
                          : "text-slate-600 hover:bg-white/60"
                      ].join(" ")}
                    >
                      {view === "insights" ? t("feedViewInsights") : t("feedViewMemory")}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:max-w-md">
              <input
                className="ui-input !h-8 min-w-[8rem] flex-1 !border-slate-200/90 !bg-transparent !py-0 text-[11px] shadow-none sm:min-w-[10rem]"
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                aria-label={t("filterSearchLabel")}
              />
              <button
                type="button"
                className={[
                  "inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border px-2.5 text-[11px] font-medium transition",
                  advancedOpen || advancedActiveCount > 0
                    ? "border-violet-300 bg-violet-50/80 text-violet-800"
                    : "border-slate-200/90 bg-transparent text-slate-600 hover:border-slate-300"
                ].join(" ")}
                onClick={onAdvancedToggle}
                aria-expanded={advancedOpen}
              >
                {t("expandFilters")}
                {advancedActiveCount > 0 ? (
                  <span className="rounded-full bg-violet-600 px-1 py-px text-[9px] font-bold text-white">
                    {advancedActiveCount}
                  </span>
                ) : null}
              </button>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {t("filterLensLabel")}
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {CATEGORY_CHIPS.map((chip) => {
                const active = categoryChip === chip;
                return (
                  <button
                    key={chip}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onCategoryChipChange(chip)}
                    className={[
                      "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                      active
                        ? "border-violet-300 bg-violet-100 text-violet-900"
                        : "border-slate-200/90 bg-transparent text-slate-600 hover:border-slate-300 hover:bg-white/50"
                    ].join(" ")}
                  >
                    {categoryLabel(chip)}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
