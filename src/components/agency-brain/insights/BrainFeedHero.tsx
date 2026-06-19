"use client";

import { useTranslations } from "next-intl";

import { EvidenceSourcesLegend } from "@/components/agency-brain/insights/EvidenceSources";
import type { FeedVariant } from "@/lib/agency-brain/insights/types";
import type { BrainFeedStats as BrainFeedStatsType } from "@/lib/agency-brain/insights/types";

export function BrainFeedHero({
  variant,
  stats
}: {
  variant: FeedVariant;
  stats: BrainFeedStatsType;
}) {
  const t = useTranslations("brainInsights");
  const isLearnings = variant === "learnings";

  return (
    <section
      className={[
        "relative shrink-0 overflow-hidden rounded-xl border px-4 py-3.5 shadow-sm sm:px-5",
        isLearnings
          ? "border-violet-100 bg-gradient-to-r from-violet-50/80 via-white to-sky-50/60"
          : "border-amber-100 bg-gradient-to-r from-amber-50/80 via-white to-orange-50/40"
      ].join(" ")}
    >
      <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={[
                "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white",
                isLearnings ? "bg-violet-600" : "bg-amber-500"
              ].join(" ")}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                {isLearnings ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                )}
              </svg>
            </span>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              {t(isLearnings ? "learningsFeedTitle" : "hypothesesFeedTitle")}
            </h1>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm">
            {t(isLearnings ? "learningsFeedSubtitle" : "hypothesesFeedSubtitle")}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:gap-3">
          {isLearnings ? (
            <>
              <div className="flex items-baseline gap-1 rounded-lg border border-white/80 bg-white/80 px-3 py-1.5">
                <span className="text-lg font-bold tabular-nums text-slate-900">
                  {stats.learningsCount}
                </span>
                <span className="text-[11px] text-slate-500">{t("statsLearnings")}</span>
              </div>
              <div className="flex items-baseline gap-1 rounded-lg border border-white/80 bg-white/80 px-3 py-1.5">
                <span className="text-lg font-bold tabular-nums text-slate-900">
                  {stats.highImpactCount}
                </span>
                <span className="text-[11px] text-slate-500">{t("statsHighImpact")}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-1 rounded-lg border border-white/80 bg-white/80 px-3 py-1.5">
                <span className="text-lg font-bold tabular-nums text-slate-900">
                  {stats.hypothesesTestingCount}
                </span>
                <span className="text-[11px] text-slate-500">{t("statsHypothesesTesting")}</span>
              </div>
              <div className="flex items-baseline gap-1 rounded-lg border border-white/80 bg-white/80 px-3 py-1.5">
                <span className="text-lg font-bold tabular-nums text-slate-900">
                  {stats.hypothesesPendingCount}
                </span>
                <span className="text-[11px] text-slate-500">{t("statsHypothesesPending")}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {isLearnings ? (
        <div className="relative mt-2.5 border-t border-violet-100/60 pt-2">
          <EvidenceSourcesLegend />
        </div>
      ) : null}
    </section>
  );
}
