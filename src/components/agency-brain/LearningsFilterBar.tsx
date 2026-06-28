"use client";

import { useTranslations } from "next-intl";

import { FilterSearchInput } from "@/components/FilterSearchInput";
import type { LearningCategory } from "@/lib/agency-brain/types";
import type { LearningScopeId } from "@/lib/agency-brain/learning-scopes";
import { cn } from "@/lib/cn";

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
        <p className="campaign-creator-orion-section-label mb-1.5">{t("filterMemoryLayerTitle")}</p>
        <div className="flex flex-wrap gap-3">
          {memoryLayers.map((layer) => {
            const active = scope === layer.id;
            return (
              <label
                key={layer.id}
                className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-[var(--text-dim)]"
              >
                <input
                  type="radio"
                  name="memory-layer"
                  className="h-3.5 w-3.5 border-[var(--creator-card-border)] text-[var(--ui-accent)] focus:ring-[var(--ui-accent)]"
                  checked={active}
                  onChange={() => onScopeChange(layer.id)}
                />
                <span className={active ? "font-semibold text-[var(--text-main)]" : ""}>
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
              <p className="campaign-creator-orion-section-label mb-1.5">{t("filterFeedViewLabel")}</p>
              <div className="flex gap-1 rounded-lg border border-[var(--creator-card-border)] bg-[var(--creator-card-bg-inset)] p-0.5">
                {(["insights", "memory"] as FeedViewId[]).map((view) => {
                  const active = feedView === view;
                  return (
                    <button
                      key={view}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onFeedViewChange(view)}
                      className={cn(
                        "rounded-md px-3 py-1 text-xs font-semibold transition",
                        active
                          ? "bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]"
                          : "text-[var(--text-dim)] hover:bg-[var(--creator-card-bg)]"
                      )}
                    >
                      {view === "insights" ? t("feedViewInsights") : t("feedViewMemory")}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:max-w-md">
              <FilterSearchInput
                creatorField
                size="wide"
                className="!h-8 min-h-8 flex-1 !py-1.5 text-xs"
                value={search}
                onChange={onSearchChange}
                placeholder={t("searchPlaceholder")}
                aria-label={t("filterSearchLabel")}
              />
              <button
                type="button"
                className={cn(
                  "inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border px-2.5 text-[11px] font-medium transition",
                  advancedOpen || advancedActiveCount > 0
                    ? "border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]"
                    : "border-[var(--creator-card-border)] bg-transparent text-[var(--text-dim)] hover:border-[var(--ui-accent-border)]"
                )}
                onClick={onAdvancedToggle}
                aria-expanded={advancedOpen}
              >
                {t("expandFilters")}
                {advancedActiveCount > 0 ? (
                  <span className="rounded-full bg-[var(--ui-accent)] px-1 py-px text-[9px] font-bold text-[var(--ui-accent-btn-text)]">
                    {advancedActiveCount}
                  </span>
                ) : null}
              </button>
            </div>
          </div>

          <div>
            <p className="campaign-creator-orion-section-label mb-1.5">{t("filterLensLabel")}</p>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {CATEGORY_CHIPS.map((chip) => {
                const active = categoryChip === chip;
                return (
                  <button
                    key={chip}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onCategoryChipChange(chip)}
                    className={cn(
                      "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                      active
                        ? "border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]"
                        : "border-[var(--creator-card-border)] bg-transparent text-[var(--text-dim)] hover:border-[var(--ui-accent-border)]"
                    )}
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
