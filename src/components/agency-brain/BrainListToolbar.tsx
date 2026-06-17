"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

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

  if (compact) {
    return (
      <div className="shrink-0 space-y-2 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
        {filters}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
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

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span>{t("resultsCount", { count: total })}</span>
            {listLoading ? <span className="text-slate-400">{t("updating")}</span> : null}
            {totalPages > 1 ? (
              <>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                  disabled={page <= 1}
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                >
                  {t("prevPage")}
                </button>
                <span>{t("pageOf", { page, total: totalPages })}</span>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
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
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-slate-500">{t("sortLabel")}</label>
          <select
            className="ui-select text-sm"
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            className="ui-select text-sm"
            value={sortDir}
            onChange={(e) => onSortDirChange(e.target.value as "asc" | "desc")}
          >
            <option value="desc">{t("sortDir.desc")}</option>
            <option value="asc">{t("sortDir.asc")}</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>{t("resultsCount", { count: total })}</span>
          {listLoading ? <span className="text-slate-400">{t("updating")}</span> : null}
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
          <span className="text-xs text-slate-500">
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
