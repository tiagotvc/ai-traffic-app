"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import type { BrainSortOption } from "@/components/agency-brain/BrainListToolbar";
import type {
  LearningCategory,
  LearningConfidence,
  LearningImpact,
  LearningSource,
  LearningStatus
} from "@/lib/agency-brain/types";

const CATEGORIES: LearningCategory[] = [
  "CREATIVE",
  "AUDIENCE",
  "OFFER",
  "COPY",
  "BUDGET",
  "LANDING_PAGE",
  "SEASONALITY",
  "GENERAL"
];

const TAG_CHIPS = ["ai", "signal", "hypothesis"] as const;

export function LearningFilters({
  search,
  category,
  impact,
  status,
  source,
  confidence,
  dateFrom,
  dateTo,
  tagFilter,
  onSearchChange,
  onCategoryChange,
  onImpactChange,
  onStatusChange,
  onSourceChange,
  onConfidenceChange,
  onDateFromChange,
  onDateToChange,
  onTagFilterChange,
  sortBy,
  sortDir,
  sortOptions,
  onSortByChange,
  onSortDirChange,
  total,
  listLoading,
  page,
  totalPages,
  onPageChange,
  embedded = false,
  clients,
  clientSlug,
  onClientChange
}: {
  search: string;
  category: LearningCategory | "";
  impact: LearningImpact | "";
  status: LearningStatus | "";
  source: LearningSource | "";
  confidence: LearningConfidence | "";
  dateFrom: string;
  dateTo: string;
  tagFilter: string;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: LearningCategory | "") => void;
  onImpactChange: (value: LearningImpact | "") => void;
  onStatusChange: (value: LearningStatus | "") => void;
  onSourceChange: (value: LearningSource | "") => void;
  onConfidenceChange: (value: LearningConfidence | "") => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onTagFilterChange: (value: string) => void;
  sortBy: string;
  sortDir: "asc" | "desc";
  sortOptions: BrainSortOption[];
  onSortByChange: (value: string) => void;
  onSortDirChange: (value: "asc" | "desc") => void;
  total: number;
  listLoading?: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  embedded?: boolean;
  clients?: { id: string; slug: string; name: string }[];
  clientSlug?: string;
  onClientChange?: (slug: string) => void;
}) {
  const t = useTranslations("agencyBrain");
  const [expanded, setExpanded] = useState(false);

  const activeFilterCount = useMemo(
    () =>
      [
        category,
        impact,
        status,
        source,
        confidence,
        dateFrom,
        dateTo,
        tagFilter
      ].filter(Boolean).length,
    [category, impact, status, source, confidence, dateFrom, dateTo, tagFilter]
  );

  return (
    <div className={embedded ? "space-y-1.5" : "shrink-0 space-y-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-sm"}>
      <div className="flex flex-wrap items-center gap-1.5">
        {clients && clients.length > 0 && onClientChange ? (
          <select
            className="ui-select !w-auto !py-1 text-xs"
            value={clientSlug ?? ""}
            onChange={(e) => onClientChange(e.target.value)}
            aria-label={t("clientLabel")}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        ) : null}
        <input
          className="ui-input !w-32 !py-1 text-xs sm:!w-40"
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <select
          className="ui-select !w-auto !py-1 text-xs"
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value)}
          aria-label={t("sortLabel")}
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          className="ui-select !w-auto !py-1 text-xs"
          value={sortDir}
          onChange={(e) => onSortDirChange(e.target.value as "asc" | "desc")}
        >
          <option value="desc">{t("sortDir.desc")}</option>
          <option value="asc">{t("sortDir.asc")}</option>
        </select>
        <button
          type="button"
          className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition ${
            expanded || activeFilterCount > 0
              ? "border-violet-300 bg-violet-50 text-violet-800"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? t("collapseFilters") : t("expandFilters")}
          {activeFilterCount > 0 ? (
            <span className="rounded-full bg-violet-600 px-1 py-0.5 text-[9px] font-bold text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </button>

        <div className="ml-auto flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 sm:text-[11px]">
          <span>{t("resultsCount", { count: total })}</span>
          {listLoading ? <span className="text-slate-400">{t("updating")}</span> : null}
          {totalPages > 1 ? (
            <>
              <button
                type="button"
                className="rounded border border-slate-200 px-1.5 py-0.5 font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => onPageChange(Math.max(1, page - 1))}
              >
                {t("prevPage")}
              </button>
              <span>{t("pageOf", { page, total: totalPages })}</span>
              <button
                type="button"
                className="rounded border border-slate-200 px-1.5 py-0.5 font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                disabled={page >= totalPages}
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              >
                {t("nextPage")}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {expanded ? (
        <div className="animate-fade-in space-y-2 rounded-lg border border-slate-100 bg-slate-50/80 p-2">
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            <select
              className="ui-select !py-1 text-xs"
              value={category}
              onChange={(e) => onCategoryChange(e.target.value as LearningCategory | "")}
            >
              <option value="">{t("filterAllCategories")}</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`category.${c}`)}
                </option>
              ))}
            </select>
            <select
              className="ui-select !py-1 text-xs"
              value={impact}
              onChange={(e) => onImpactChange(e.target.value as LearningImpact | "")}
            >
              <option value="">{t("filterAllImpact")}</option>
              {(["LOW", "MEDIUM", "HIGH"] as LearningImpact[]).map((i) => (
                <option key={i} value={i}>
                  {t(`impact.${i}`)}
                </option>
              ))}
            </select>
            <select
              className="ui-select !py-1 text-xs"
              value={status}
              onChange={(e) => onStatusChange(e.target.value as LearningStatus | "")}
            >
              <option value="">{t("filterAllStatus")}</option>
              {(["SUGGESTED", "APPROVED", "REJECTED", "ARCHIVED"] as LearningStatus[]).map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`)}
                </option>
              ))}
            </select>
            <select
              className="ui-select !py-1 text-xs"
              value={source}
              onChange={(e) => onSourceChange(e.target.value as LearningSource | "")}
            >
              <option value="">{t("filterAllSource")}</option>
              {(["MANUAL", "RULE", "AI", "IMPORTED"] as LearningSource[]).map((s) => (
                <option key={s} value={s}>
                  {t(`source.${s}`)}
                </option>
              ))}
            </select>
            <select
              className="ui-select !py-1 text-xs"
              value={confidence}
              onChange={(e) => onConfidenceChange(e.target.value as LearningConfidence | "")}
            >
              <option value="">{t("filterAllConfidence")}</option>
              {(["LOW", "MEDIUM", "HIGH"] as LearningConfidence[]).map((c) => (
                <option key={c} value={c}>
                  {t(`confidence.${c}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5 sm:grid-cols-2">
            <div>
              <label className="mb-0.5 block text-[10px] text-slate-500">{t("filterDateFrom")}</label>
              <input
                type="date"
                className="ui-input !py-1 text-xs"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-0.5 block text-[10px] text-slate-500">{t("filterDateTo")}</label>
              <input
                type="date"
                className="ui-input !py-1 text-xs"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${
                !tagFilter
                  ? "bg-violet-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
              onClick={() => onTagFilterChange("")}
            >
              {t("filterAllTags")}
            </button>
            {TAG_CHIPS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${
                  tagFilter === tag
                    ? "bg-violet-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
                onClick={() => onTagFilterChange(tagFilter === tag ? "" : tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
