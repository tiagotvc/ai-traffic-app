"use client";

import { useTranslations } from "next-intl";
import { Building2, ArrowUpDown, ArrowDownUp } from "lucide-react";
import { useMemo, useState } from "react";

import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { FilterSearchInput } from "@/components/FilterSearchInput";

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
  onClientChange,
  hideStatus = false,
  hideDateFilters = false,
  hidePagination = false,
  clientInExpanded = false,
  hidePrimaryRow = false,
  expanded: controlledExpanded,
  onExpandedChange
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
  hideStatus?: boolean;
  hideDateFilters?: boolean;
  hidePagination?: boolean;
  clientInExpanded?: boolean;
  hidePrimaryRow?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}) {
  const t = useTranslations("agencyBrain");
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = controlledExpanded ?? internalExpanded;
  const toggleExpanded = () => {
    if (onExpandedChange) onExpandedChange(!expanded);
    else setInternalExpanded((v) => !v);
  };

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
    <div className={embedded ? "space-y-1.5" : "shrink-0 space-y-1.5 ui-card p-2 shadow-sm"}>
      {!hidePrimaryRow ? (
      <div className="flex flex-wrap items-center gap-1.5">
        {clients && clients.length > 0 && onClientChange && !clientInExpanded ? (
          <FilterSelectDropdown
            icon={<Building2 size={14} />}
            label={t("clientPickerLabel")}
            placeholder={t("clientPickerPlaceholder")}
            value={clientSlug ?? ""}
            onChange={onClientChange}
            options={clients.map((c) => ({ value: c.slug, label: c.name }))}
          />
        ) : null}
        <FilterSearchInput
          size="compact"
          value={search}
          onChange={onSearchChange}
          placeholder={t("searchPlaceholder")}
        />
        <FilterSelectDropdown
          icon={<ArrowUpDown size={14} />}
          label={t("sortLabel")}
          placeholder={sortOptions[0]?.label ?? t("sortLabel")}
          clearable={false}
          value={sortBy}
          onChange={onSortByChange}
          options={sortOptions.map((opt) => ({ value: opt.value, label: opt.label }))}
        />
        <FilterSelectDropdown
          icon={<ArrowDownUp size={14} />}
          label={t("sortLabel")}
          placeholder={t("sortDir.desc")}
          clearable={false}
          value={sortDir}
          onChange={(v) => onSortDirChange(v as "asc" | "desc")}
          options={[
            { value: "desc", label: t("sortDir.desc") },
            { value: "asc", label: t("sortDir.asc") }
          ]}
        />
        <button
          type="button"
          className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition ${
            expanded || activeFilterCount > 0
              ? "border-violet-300 bg-[rgba(124,58,237,0.06)] text-[var(--violet)]"
              : "border-[var(--border-color)] bg-white text-[var(--text-dim)] hover:bg-[var(--surface-thead)]"
          }`}
          onClick={toggleExpanded}
          aria-expanded={expanded}
        >
          {expanded ? t("collapseFilters") : t("expandFilters")}
          {activeFilterCount > 0 ? (
            <span className="rounded-full bg-[var(--ui-accent)] px-1 py-0.5 text-[9px] font-bold text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </button>

        <div className="ml-auto flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--text-dim)] sm:text-[11px]">
          {!hidePagination ? (
            <>
              <span>{t("resultsCount", { count: total })}</span>
              {listLoading ? <span className="text-[var(--text-dimmer)]">{t("updating")}</span> : null}
            </>
          ) : null}
        </div>
      </div>
      ) : null}

      {expanded ? (
        <div className="animate-fade-in space-y-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-thead)] p-2">
          {clients && clients.length > 0 && onClientChange && clientInExpanded ? (
            <FilterSelectDropdown
              icon={<Building2 size={14} />}
              label={t("clientPickerLabel")}
              placeholder={t("clientPickerPlaceholder")}
              value={clientSlug ?? ""}
              onChange={onClientChange}
              options={clients.map((c) => ({ value: c.slug, label: c.name }))}
            />
          ) : null}
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
            {!hideStatus ? (
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
            ) : null}
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

          {!hideDateFilters ? (
            <div className="grid gap-1.5 sm:grid-cols-2">
              <div>
                <label className="mb-0.5 block text-[10px] text-[var(--text-dim)]">{t("filterDateFrom")}</label>
                <input
                  type="date"
                  className="ui-input !py-1 text-xs"
                  value={dateFrom}
                  onChange={(e) => onDateFromChange(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[10px] text-[var(--text-dim)]">{t("filterDateTo")}</label>
                <input
                  type="date"
                  className="ui-input !py-1 text-xs"
                  value={dateTo}
                  onChange={(e) => onDateToChange(e.target.value)}
                />
              </div>
            </div>
          ) : null}

          {hidePrimaryRow ? (
            <div className="grid gap-1.5 sm:grid-cols-2">
              <select
                className="ui-select !py-1 text-xs"
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
                className="ui-select !py-1 text-xs"
                value={sortDir}
                onChange={(e) => onSortDirChange(e.target.value as "asc" | "desc")}
              >
                <option value="desc">{t("sortDir.desc")}</option>
                <option value="asc">{t("sortDir.asc")}</option>
              </select>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${
                !tagFilter
                  ? "bg-[var(--ui-accent)] text-white"
                  : "bg-white text-[var(--text-dim)] hover:bg-[var(--surface-thead)]"
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
                    ? "bg-[var(--ui-accent)] text-white"
                    : "bg-white text-[var(--text-dim)] hover:bg-[var(--surface-thead)]"
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
