"use client";

import { useTranslations } from "next-intl";

import type {
  LearningCategory,
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

export function LearningFilters({
  search,
  category,
  impact,
  status,
  source,
  onSearchChange,
  onCategoryChange,
  onImpactChange,
  onStatusChange,
  onSourceChange
}: {
  search: string;
  category: LearningCategory | "";
  impact: LearningImpact | "";
  status: LearningStatus | "";
  source: LearningSource | "";
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: LearningCategory | "") => void;
  onImpactChange: (value: LearningImpact | "") => void;
  onStatusChange: (value: LearningStatus | "") => void;
  onSourceChange: (value: LearningSource | "") => void;
}) {
  const t = useTranslations("agencyBrain");

  return (
    <div className="ui-card p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
      </div>
    </div>
  );
}
