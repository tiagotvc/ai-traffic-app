"use client";

import { ArrowDownUp, ArrowUpDown } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";

export type BrainSortOption = {
  value: string;
  label: string;
};

export function BrainListToolbar({
  sortBy,
  sortDir,
  sortOptions,
  onSortByChange,
  onSortDirChange,
  page,
  totalPages,
  total,
  onPageChange,
  listLoading,
  filters,
  compact = false
}: {
  sortBy: string;
  sortDir: "asc" | "desc";
  sortOptions: BrainSortOption[];
  onSortByChange: (value: string) => void;
  onSortDirChange: (value: "asc" | "desc") => void;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  listLoading?: boolean;
  filters?: ReactNode;
  compact?: boolean;
}) {
  const t = useTranslations("agencyBrain");

  const sortControls = (
    <>
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
    </>
  );

  if (compact) {
    return (
      <div className="ui-card shrink-0 space-y-2 p-2.5">
        {filters}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">{sortControls}</div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-dim)]">
            <span>{t("resultsCount", { count: total })}</span>
            {listLoading ? <span className="text-[var(--text-dimmer)]">{t("updating")}</span> : null}
            {totalPages > 1 ? (
              <>
                <button
                  type="button"
                  className="rounded-lg border border-[var(--border-color)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-dim)] transition hover:bg-[var(--surface-thead)] disabled:opacity-40"
                  disabled={page <= 1}
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                >
                  {t("prevPage")}
                </button>
                <span>{t("pageOf", { page, total: totalPages })}</span>
                <button
                  type="button"
                  className="rounded-lg border border-[var(--border-color)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-dim)] transition hover:bg-[var(--surface-thead)] disabled:opacity-40"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                >
                  {t("nextPage")}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ui-card space-y-3 p-4">
      {filters}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">{sortControls}</div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-dim)]">
          <span>{t("resultsCount", { count: total })}</span>
          {listLoading ? <span className="text-[var(--text-dimmer)]">{t("updating")}</span> : null}
        </div>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            className="ui-btn-secondary text-xs"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            {t("prevPage")}
          </button>
          <span className="text-xs text-[var(--text-dim)]">
            {t("pageOf", { page, total: totalPages })}
          </span>
          <button
            type="button"
            className="ui-btn-secondary text-xs"
            disabled={page >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          >
            {t("nextPage")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
