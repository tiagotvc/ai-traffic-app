"use client";

import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { CampaignCreatorScoreBar } from "@/components/campaign-creator/CampaignCreatorScoreBar";

function ChecklistItem({ label, complete }: { label: string; complete: boolean }) {
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
  stepPercent: number;
  promptReady: boolean;
  hasPreview: boolean;
  hasGeoRules: boolean;
};

export function ZoneCreatorSidebarProgressCard({
  stepPercent,
  promptReady,
  hasPreview,
  hasGeoRules
}: Props) {
  const t = useTranslations("audiences");
  const tCc = useTranslations("campaignCreator");

  const checks = [
    { key: "brief", complete: promptReady, label: t("zoneScoreCheckBrief") },
    { key: "places", complete: hasPreview, label: t("zoneScoreCheckPlaces") },
    { key: "geo", complete: hasGeoRules, label: t("zoneScoreCheckGeo") }
  ] as const;

  const score = Math.round(
    ((promptReady ? 1 : 0) + (hasPreview ? 1 : 0) + (hasGeoRules ? 1 : 0)) * (100 / 3)
  );

  const circumference = 2 * Math.PI * 32;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="campaign-creator-sidebar-card">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">
          {t("zoneScore")}
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
        <p className="text-xs leading-relaxed text-[var(--text-dim)]">{t("zoneScoreHint")}</p>
      </div>
      <div className="mt-3 space-y-1.5">
        {checks.map((item) => (
          <ChecklistItem key={item.key} label={item.label} complete={item.complete} />
        ))}
      </div>
      <div className="mt-3">
        <CampaignCreatorScoreBar value={score} />
      </div>
    </div>
  );
}
