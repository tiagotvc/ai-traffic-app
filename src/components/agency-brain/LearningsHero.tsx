"use client";

import { Brain } from "lucide-react";
import { useTranslations } from "next-intl";

import { AgencyBrainAiBar } from "@/components/agency-brain/AgencyBrainAiBar";
import { DsAccentOutlineButton, DsBadge, DsPageHeader } from "@/design-system";
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
    <div className="space-y-3">
      <DsPageHeader
        className="mb-0"
        title={t("brainFeedTitle")}
        subtitle={t("brainFeedSubtitle")}
        titleIcon={<Brain size={16} aria-hidden />}
        badge={<DsBadge tone="beta">{t("beta")}</DsBadge>}
        actions={
          showActions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              <AgencyBrainAiBar variant="compact" />
              <DsAccentOutlineButton
                onClick={onDetectPatterns}
                disabled={detecting || aiAnalyzing}
              >
                {detecting ? t("detecting") : t("detectPatterns")}
              </DsAccentOutlineButton>
              <button
                type="button"
                className="ui-btn-accent px-2.5 py-1.5 text-xs disabled:opacity-50"
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
          ) : undefined
        }
      />

      {summary ? (
        <div className="campaign-creator-sidebar-card-inset flex flex-wrap gap-x-4 gap-y-1 px-3 py-2 text-sm text-[var(--text-dim)]">
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
  );
}
