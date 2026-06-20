"use client";

import { useTranslations } from "next-intl";

import { AgencyBrainAiBar } from "@/components/agency-brain/AgencyBrainAiBar";
import type { BrainSummary } from "@/lib/agency-brain/types";
import { DsBadge } from "@/design-system";

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
          <h1 className="font-heading text-xl font-bold tracking-tight text-[var(--text-main)] sm:text-2xl">
            {t("brainFeedTitle")}
          </h1>
          <DsBadge tone="beta">{t("beta")}</DsBadge>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-[var(--text-dim)]">{t("brainFeedSubtitle")}</p>

        {summary ? (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--text-dim)]">
            <span>
              <strong className="font-semibold text-[var(--text-main)]">{summary.total}</strong>{" "}
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
            className="inline-flex items-center rounded-lg border border-[var(--border-color)] bg-white/80 px-2.5 py-1.5 text-xs font-medium text-[var(--text-dim)] shadow-sm transition hover:bg-white disabled:opacity-50"
            onClick={onDetectPatterns}
            disabled={detecting || aiAnalyzing}
          >
            {detecting ? t("detecting") : t("detectPatterns")}
          </button>
          <button
            type="button"
            className="ui-btn-brand px-2.5 py-1.5 text-xs disabled:opacity-50"
            onClick={onAiAnalyze}
            disabled={detecting || aiAnalyzing || aiDisabled}
            title={aiDisabled ? t("aiLimit") : undefined}
          >
            {aiAnalyzing ? t("analyzingWithAi") : t("analyzeWithAi")}
          </button>
          <button
            type="button"
            className="ui-btn-primary px-2.5 py-1.5 text-xs"
            onClick={onNewLearning}
          >
            {t("newLearning")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
