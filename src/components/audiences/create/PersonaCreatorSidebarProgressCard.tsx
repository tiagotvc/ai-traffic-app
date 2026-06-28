"use client";

import { useMemo } from "react";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { CampaignCreatorScoreBar } from "@/components/campaign-creator/CampaignCreatorScoreBar";
import {
  buildPersonaDraftScoreCheckItems,
  EMPTY_PERSONA_DRAFT_SCORE_INPUT,
  personaDraftScoreCheckLabelKey,
  type PersonaDraftScoreInput
} from "@/lib/persona-draft-score";

function scoreBandLabel(score: number, t: ReturnType<typeof useTranslations<"campaignCreator">>) {
  if (score >= 80) return t("scoreBandGreat");
  if (score >= 55) return t("scoreBandGood");
  return t("scoreBandFair");
}

function ScoreChecklistItem({ label, complete }: { label: string; complete: boolean }) {
  return (
    <div
      className={
        complete
          ? "campaign-creator-summary-checklist-item campaign-creator-summary-checklist-item--complete"
          : "campaign-creator-summary-checklist-item campaign-creator-summary-checklist-item--incomplete"
      }
    >
      <CheckCircle2
        size={14}
        strokeWidth={2.25}
        className={
          complete
            ? "campaign-creator-summary-checklist-item__icon--complete shrink-0"
            : "campaign-creator-summary-checklist-item__icon--incomplete shrink-0"
        }
        aria-hidden
      />
      <span className="min-w-0 truncate">{label}</span>
    </div>
  );
}

type Props = {
  score: number;
  scoreInput: PersonaDraftScoreInput | null;
  manualMode: boolean;
  stepPercent: number;
  onOpenSummary: () => void;
};

export function PersonaCreatorSidebarProgressCard({
  score,
  scoreInput,
  manualMode,
  stepPercent,
  onOpenSummary
}: Props) {
  const tAud = useTranslations("audiences");
  const tCc = useTranslations("campaignCreator");
  const scoreBand = scoreBandLabel(score, tCc);
  const circumference = 2 * Math.PI * 32;
  const offset = circumference - (score / 100) * circumference;

  const checkItems = useMemo(() => {
    const input = scoreInput ?? { ...EMPTY_PERSONA_DRAFT_SCORE_INPUT, manualMode };
    return buildPersonaDraftScoreCheckItems(input);
  }, [scoreInput, manualMode]);

  return (
    <div className="campaign-creator-sidebar-card">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">
          {tAud("personaScore")}
        </h3>
        <span className="rounded-full bg-[var(--ui-accent-muted)] px-2 py-0.5 font-heading text-[11px] font-semibold text-[var(--ui-accent)]">
          {tCc("wizardProgress", { percent: stepPercent })}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <div className="relative h-[4.5rem] w-[4.5rem] shrink-0">
          <svg className="h-[4.5rem] w-[4.5rem] -rotate-90" viewBox="0 0 72 72" aria-hidden>
            <circle cx="36" cy="36" r="32" fill="none" stroke="var(--border-color)" strokeWidth="5" />
            <circle
              cx="36"
              cy="36"
              r="32"
              fill="none"
              stroke="var(--ui-accent)"
              strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-heading text-lg font-bold text-[var(--ui-accent)]">
            {score}
          </span>
        </div>
        <p className="text-xs leading-relaxed text-[var(--text-dim)]">
          <span className="font-semibold text-[var(--text-main)]">{scoreBand}</span>
          {" · "}
          {tCc("scoreHint")}
        </p>
      </div>
      <div className="mt-3 space-y-1.5">
        {checkItems.map((item) => {
          const { namespace, messageKey } = personaDraftScoreCheckLabelKey(item.key, manualMode);
          const label = namespace === "audiences" ? tAud(messageKey) : tCc(messageKey);
          return (
            <ScoreChecklistItem key={item.key} label={label} complete={item.complete} />
          );
        })}
      </div>
      <div className="mt-3">
        <CampaignCreatorScoreBar value={score} />
      </div>
      <button
        type="button"
        onClick={onOpenSummary}
        className="ui-btn-accent-outline mt-3 inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 text-xs font-heading font-semibold"
      >
        {tAud("sidebarContextPersona")}
        <ChevronRight size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}
