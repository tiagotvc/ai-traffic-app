"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/cn";

type Props = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  prevLabel: string;
  nextLabel: string;
  className?: string;
  disabled?: boolean;
};

/** Paginação compacta no header de tabelas (campanhas, públicos Meta, admin). */
export function CompactTablePager({
  page,
  pageCount,
  onPageChange,
  prevLabel,
  nextLabel,
  className,
  disabled = false
}: Props) {
  if (pageCount <= 1) return null;

  return (
    <div className={cn("flex shrink-0 items-center gap-1.5 text-xs", className)}>
      <button
        type="button"
        disabled={disabled || page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-color)] text-[var(--text-dim)] transition-colors hover:bg-[var(--row-hover)] disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={prevLabel}
      >
        <ChevronLeft size={14} />
      </button>
      <span className="min-w-[3.5rem] text-center font-medium tabular-nums text-[var(--text-dim)]">
        {page} / {pageCount}
      </span>
      <button
        type="button"
        disabled={disabled || page >= pageCount}
        onClick={() => onPageChange(page + 1)}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-color)] text-[var(--text-dim)] transition-colors hover:bg-[var(--row-hover)] disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={nextLabel}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
