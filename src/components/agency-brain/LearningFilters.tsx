"use client";

import { useTranslations } from "next-intl";

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
  onTagFilterChange
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
}) {
  const t = useTranslations("agencyBrain");

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <input
          className="ui-input"
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <select
          className="ui-select"
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
          className="ui-select"
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
          className="ui-select"
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
          className="ui-select"
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
          className="ui-select"
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

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-slate-500">{t("filterDateFrom")}</label>
          <input
            type="date"
            className="ui-input"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">{t("filterDateTo")}</label>
          <input
            type="date"
            className="ui-input"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            !tagFilter
              ? "bg-violet-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
          onClick={() => onTagFilterChange("")}
        >
          {t("filterAllTags")}
        </button>
        {TAG_CHIPS.map((tag) => (
          <button
            key={tag}
            type="button"
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              tagFilter === tag
                ? "bg-violet-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
            onClick={() => onTagFilterChange(tagFilter === tag ? "" : tag)}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
