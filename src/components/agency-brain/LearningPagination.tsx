"use client";

import { useTranslations } from "next-intl";

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      {direction === "left" ? (
        <path
          fillRule="evenodd"
          d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
          clipRule="evenodd"
        />
      ) : (
        <path
          fillRule="evenodd"
          d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.25 4.25a.75.75 0 010 1.08l-4.25 4.25a.75.75 0 01-1.06-.02z"
          clipRule="evenodd"
        />
      )}
    </svg>
  );
}

export function LearningPagination({
  page,
  totalPages,
  total,
  listLoading,
  onPageChange
}: {
  page: number;
  totalPages: number;
  total: number;
  listLoading?: boolean;
  onPageChange: (page: number) => void;
}) {
  const t = useTranslations("agencyBrain");

  if (total === 0) return null;

  return (
    <div className="mb-3 shrink-0 border-t border-[var(--border-color)] bg-[var(--surface-bg)] px-3 py-2.5  lg:mb-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] text-[var(--text-dim)]">
          <span>{t("resultsCount", { count: total })}</span>
          {listLoading ? <span className="text-[var(--text-dimmer)]">{t("updating")}</span> : null}
        </div>

        {totalPages > 1 ? (
          <nav
            className="flex items-center gap-1"
            aria-label={t("paginationLabel")}
          >
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-color)] text-[var(--text-dim)] transition hover:bg-[var(--surface-thead)] disabled:cursor-not-allowed disabled:opacity-35"
              disabled={page <= 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
              aria-label={t("prevPage")}
            >
              <ChevronIcon direction="left" />
            </button>

            <div className="flex items-center gap-0.5 px-0.5">
              {Array.from({ length: totalPages }, (_, index) => {
                const pageNum = index + 1;
                const active = pageNum === page;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    aria-current={active ? "page" : undefined}
                    aria-label={t("pageOf", { page: pageNum, total: totalPages })}
                    onClick={() => onPageChange(pageNum)}
                    className={[
                      "min-w-[2rem] rounded-lg px-2 py-1 text-xs font-semibold tabular-nums transition",
                      active
                        ? "bg-[var(--amber-bright)] text-white shadow-sm"
                        : "text-[var(--text-dim)] hover:bg-[var(--ui-accent)]/10 hover:text-[var(--amber-bright)]"
                    ].join(" ")}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-color)] text-[var(--text-dim)] transition hover:bg-[var(--surface-thead)] disabled:cursor-not-allowed disabled:opacity-35"
              disabled={page >= totalPages}
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              aria-label={t("nextPage")}
            >
              <ChevronIcon direction="right" />
            </button>
          </nav>
        ) : (
          <span className="text-[11px] font-medium tabular-nums text-[var(--text-dim)]">
            {t("pageOf", { page, total: totalPages })}
          </span>
        )}
      </div>
    </div>
  );
}
