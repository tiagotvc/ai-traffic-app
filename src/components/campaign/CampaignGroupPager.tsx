"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/cn";

export function CampaignGroupPager({
  page,
  pageCount,
  onPageChange,
  className
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const t = useTranslations("campaignsPage");

  if (pageCount <= 1) return null;

  return (
    <div className={cn("flex shrink-0 items-center gap-1.5 text-xs", className)}>
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="flex h-7 w-7 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
        aria-label={t("groupPagePrev")}
      >
        <ChevronLeft size={14} />
      </button>
      <span className="min-w-[3.5rem] text-center font-medium tabular-nums" style={{ color: "var(--text-dim)" }}>
        {page} / {pageCount}
      </span>
      <button
        type="button"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
        className="flex h-7 w-7 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
        aria-label={t("groupPageNext")}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
