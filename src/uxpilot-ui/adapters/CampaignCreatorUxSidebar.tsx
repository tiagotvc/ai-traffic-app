"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";

import { CampaignCreatorBrainTips } from "@/components/campaign-creator/CampaignCreatorBrainTips";
import { CampaignCreatorResearchCard } from "@/components/campaign-creator/CampaignCreatorResearchCard";
import { CampaignCreatorScoreBar } from "@/components/campaign-creator/CampaignCreatorScoreBar";
import { CampaignCreatorSummaryModal } from "@/components/campaign-creator/CampaignCreatorSummaryModal";
import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import {
  CampaignCreatorUxNav,
  computeWizardProgressPercent
} from "@/uxpilot-ui/adapters/CampaignCreatorUxChrome";
import { computeDraftScore } from "@/lib/campaign-draft";

function scoreBandLabel(score: number, t: ReturnType<typeof useTranslations<"campaignCreator">>) {
  if (score >= 80) return t("scoreBandGreat");
  if (score >= 55) return t("scoreBandGood");
  return t("scoreBandFair");
}

function SidebarProgressCard({ onOpenSummary }: { onOpenSummary: () => void }) {
  const t = useTranslations("campaignCreator");
  const { payload, activeNode, addAdMode } = useCampaignDraft();
  const stepPercent = computeWizardProgressPercent({ addAdMode, activeNode });
  const score = computeDraftScore(payload);
  const scoreBand = scoreBandLabel(score, t);
  const circumference = 2 * Math.PI * 32;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="campaign-creator-sidebar-card">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">{t("campaignScore")}</h3>
        <span className="rounded-full bg-[var(--ui-accent-muted)] px-2 py-0.5 font-heading text-[11px] font-semibold text-[var(--ui-accent)]">
          {t("wizardProgress", { percent: stepPercent })}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <div className="relative h-[4.5rem] w-[4.5rem] shrink-0">
          <svg className="h-[4.5rem] w-[4.5rem] -rotate-90" viewBox="0 0 72 72">
            <circle
              cx="36"
              cy="36"
              r="32"
              fill="none"
              stroke="var(--border-color)"
              strokeWidth="5"
            />
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
          {t("scoreHint")}
        </p>
      </div>
      <div className="mt-3">
        <CampaignCreatorScoreBar value={score} />
      </div>
      <button
        type="button"
        onClick={onOpenSummary}
        className="ui-btn-accent-outline mt-3 inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 text-xs font-heading font-semibold"
      >
        {t("sidebarContextCampaign")}
        <ChevronRight size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}

export function CampaignCreatorUxSidebar({
  onPublish,
  publishing
}: {
  onPublish?: () => void;
  publishing?: boolean;
}) {
  const [summaryOpen, setSummaryOpen] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="campaign-creator-sidebar__scroll min-h-0 flex-1 overflow-y-auto">
        <div className="campaign-creator-sidebar__inner space-y-3 py-1">
          <SidebarProgressCard onOpenSummary={() => setSummaryOpen(true)} />
          <CampaignCreatorBrainTips />
          <CampaignCreatorResearchCard />
        </div>
      </div>
      <div className="campaign-creator-sidebar-footer shrink-0">
        <CampaignCreatorUxNav onPublish={onPublish} publishing={publishing} placement="sidebar" />
      </div>
      <CampaignCreatorSummaryModal open={summaryOpen} onClose={() => setSummaryOpen(false)} />
    </div>
  );
}
