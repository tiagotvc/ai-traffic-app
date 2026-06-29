"use client";

import { useMemo, useState } from "react";
import { Pause, Play, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { CampaignCreatorScoreBar } from "@/components/campaign-creator/CampaignCreatorScoreBar";
import type { AudienceCreatorScoreItem } from "@/components/audiences/create/AudienceCreatorSidebarProgressCard";

type AudienceStepKey = "setup" | "rules" | "review";
type AudienceTypeChoice = "custom" | "lookalike" | "saved" | "";

type Props = {
  step: AudienceStepKey;
  typeChoice: AudienceTypeChoice;
  score: number;
  scoreItems: AudienceCreatorScoreItem[];
};

function resolveTipKey(step: AudienceStepKey, typeChoice: AudienceTypeChoice): string {
  if (step === "review") return "tipReview";
  if (step === "rules") return "tipRules";
  if (typeChoice === "lookalike") return "tipLookalike";
  if (typeChoice === "custom") return "tipCustom";
  if (typeChoice === "saved") return "tipSaved";
  return "tipDefault";
}

function macroLabelForStep(step: AudienceStepKey, t: ReturnType<typeof useTranslations<"audienceCreator">>) {
  if (step === "setup") return t("macroStepSetup");
  if (step === "rules") return t("macroStepRules");
  return t("macroStepReview");
}

export function AudienceCreatorBrainTips({ step, typeChoice, score, scoreItems }: Props) {
  const t = useTranslations("audienceCreator");
  const tCc = useTranslations("campaignCreator");
  const [paused, setPaused] = useState(false);

  const tipKey = useMemo(() => resolveTipKey(step, typeChoice), [step, typeChoice]);
  const tipText = t(tipKey as Parameters<typeof t>[0]);

  const missingItems = scoreItems.filter((item) => !item.done).map((item) => t(item.labelKey));

  return (
    <div className="campaign-creator-sidebar-card" data-orion-brain-tips>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
            <Sparkles size={15} strokeWidth={2.25} />
          </span>
          <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">{tCc("brainTipsTitle")}</h3>
        </div>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--creator-card-border,var(--border-color))] px-2 py-1 text-[10px] font-medium text-[var(--text-dim)] transition-colors hover:bg-[var(--creator-card-bg-inset,var(--surface-bg))] hover:text-[var(--text-main)]"
          aria-pressed={paused}
          title={paused ? tCc("brainResume") : tCc("brainPause")}
        >
          {paused ? <Play size={12} strokeWidth={2.25} /> : <Pause size={12} strokeWidth={2.25} />}
          {paused ? tCc("brainResume") : tCc("brainPause")}
        </button>
      </div>

      {paused ? (
        <p className="mt-3 text-xs leading-relaxed text-[var(--text-dim)]">{tCc("brainPausedHint")}</p>
      ) : (
        <>
          <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-[var(--text-dimmer)]">
            {macroLabelForStep(step, t)}
          </p>
          <div className="campaign-creator-sidebar-card-inset mt-2 px-3.5 py-3">
            <p className="text-xs leading-relaxed text-[var(--text-main)]">{tipText}</p>
          </div>

          {missingItems.length > 0 && score < 100 ? (
            <div className="mt-3">
              <p className="text-[10px] font-medium text-[var(--text-dimmer)]">{t("brainMissingLabel")}</p>
              <ul className="mt-1.5 space-y-1">
                {missingItems.map((label) => (
                  <li
                    key={label}
                    className="campaign-creator-summary-checklist-item campaign-creator-summary-checklist-item--incomplete"
                  >
                    <span className="min-w-0 truncate text-[11px]">{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-3">
            <CampaignCreatorScoreBar value={score} />
          </div>
        </>
      )}
    </div>
  );
}
