"use client";

import { useTranslations } from "next-intl";

import { AgencyBrainAiBar } from "@/components/agency-brain/AgencyBrainAiBar";
import type { BrainSummary } from "@/lib/agency-brain/types";

type LearningsHeroProps = {
  showActions: boolean;
  summary: BrainSummary | null;
  detecting: boolean;
  aiAnalyzing: boolean;
  aiDisabled: boolean;
  onDetectPatterns: () => void;
  onAiAnalyze: () => void;
  onNewLearning: () => void;
};

export function LearningsHero({
  showActions,
  summary,
  detecting,
  aiAnalyzing,
  aiDisabled,
  onDetectPatterns,
  onAiAnalyze,
  onNewLearning
}: LearningsHeroProps) {
  const t = useTranslations("agencyBrain");

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 py-0.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden>
            🧠
          </span>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {t("brainFeedTitle")}
          </h1>
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
            {t("beta")}
          </span>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">{t("brainFeedSubtitle")}</p>

        {summary ? (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            <span>
              <strong className="font-semibold text-slate-900">{summary.total}</strong>{" "}
              {t("brainStatMemories")}
            </span>
            <span>
              <strong className="font-semibold text-rose-700">{summary.highImpact}</strong>{" "}
              {t("brainStatHighImpact")}
            </span>
            <span>
              <strong className="font-semibold text-amber-800">{summary.pendingSuggestions}</strong>{" "}
              {t("brainStatPending")}
            </span>
          </div>
        ) : null}
      </div>

      {showActions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <AgencyBrainAiBar variant="compact" />
          <button
            type="button"
            className="inline-flex items-center rounded-lg border border-slate-200/90 bg-white/80 px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-white disabled:opacity-50"
            onClick={onDetectPatterns}
            disabled={detecting || aiAnalyzing}
          >
            {detecting ? t("detecting") : t("detectPatterns")}
          </button>
          <button
            type="button"
            className="inline-flex items-center rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-500 disabled:opacity-50"
            onClick={onAiAnalyze}
            disabled={detecting || aiAnalyzing || aiDisabled}
            title={aiDisabled ? t("aiLimit") : undefined}
          >
            {aiAnalyzing ? t("analyzingWithAi") : t("analyzeWithAi")}
          </button>
          <button
            type="button"
            className="inline-flex items-center rounded-lg border border-slate-200/90 bg-white/80 px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-white"
            onClick={onNewLearning}
          >
            {t("newLearning")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
