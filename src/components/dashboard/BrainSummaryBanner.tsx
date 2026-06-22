"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

export function BrainSummaryBanner({
  learningsCount,
  hypothesesCount,
  isLoading
}: {
  learningsCount: number;
  hypothesesCount: number;
  isLoading?: boolean;
}) {
  const t = useTranslations("dashboard");

  if (isLoading) {
    return <div className="skeleton-shimmer h-10 w-full rounded-lg" />;
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col justify-center">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
            style={{ background: "rgba(124,58,237,0.12)" }}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="#7c3aed" strokeWidth={1.75}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>
            <span className="font-semibold" style={{ color: "var(--text-main)" }}>
              {t("brainSummaryLearnings", { count: learningsCount })}
            </span>
            <span className="mx-1.5" style={{ color: "var(--text-dimmer)" }}>
              ·
            </span>
            <span className="font-semibold" style={{ color: "var(--text-main)" }}>
              {t("brainSummaryHypotheses", { count: hypothesesCount })}
            </span>
          </p>
        </div>
        <Link
          href="/agency-brain/learnings"
          className="shrink-0 text-[11px] font-semibold transition-opacity hover:opacity-80"
          style={{ color: "#7c3aed" }}
        >
          {t("brainSummaryCta")}
        </Link>
      </div>
    </div>
  );
}
