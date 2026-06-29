"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  Activity,
  Building2,
  CheckCircle2,
  Copy,
  Globe,
  MapPin,
  Tag,
  UserCheck,
  Users
} from "lucide-react";

import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";
import { CampaignCreatorScoreBar } from "@/components/campaign-creator/CampaignCreatorScoreBar";

function scoreBandLabel(score: number, t: ReturnType<typeof useTranslations<"campaignCreator">>) {
  if (score >= 80) return t("scoreBandGreat");
  if (score >= 55) return t("scoreBandGood");
  return t("scoreBandFair");
}

function OrionModalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="campaign-creator-orion-section-label">{title}</h3>
      {children}
    </section>
  );
}

function SummaryOverviewRow({
  icon,
  iconTone = "neutral",
  label,
  value
}: {
  icon: ReactNode;
  iconTone?: "neutral" | "accent" | "success" | "violet";
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="campaign-creator-review-overview-row">
      <span
        className={`campaign-creator-review-overview-row__icon campaign-creator-review-overview-row__icon--${iconTone}`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="campaign-creator-review-summary-row__label">{label}</p>
        <div className="campaign-creator-review-summary-row__value">{value}</div>
      </div>
    </div>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  score: number;
  audienceName: string;
  typeLabel: string;
  clientName: string;
  country: string;
  typeChoice: "custom" | "lookalike" | "saved" | "";
  sourceLabel?: string;
  ruleActionLabel?: string;
  windowDays?: string;
  lookalikePct?: string;
  seedName?: string;
  ageMin?: string;
  ageMax?: string;
  genders?: string;
  interests?: string;
};

export function AudienceCreatorSummaryModal({
  open,
  onClose,
  score,
  audienceName,
  typeLabel,
  clientName,
  country,
  typeChoice,
  sourceLabel,
  ruleActionLabel,
  windowDays,
  lookalikePct,
  seedName,
  ageMin,
  ageMax,
  genders,
  interests
}: Props) {
  const t = useTranslations("audienceCreator");
  const tCc = useTranslations("campaignCreator");
  const band = scoreBandLabel(score, tCc);

  return (
    <CreatorModalShell
      open={open}
      onClose={onClose}
      title={t("sidebarContextAudience")}
      subtitle={audienceName || t("audienceNamePreview")}
      titleIcon={<UserCheck size={16} />}
      width="lg"
      hideFooter
      contentClassName="space-y-5"
    >
      <div className="campaign-creator-sidebar-card-inset px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-dimmer)]">
              {t("completeness")}
            </p>
            <p className="mt-0.5 font-heading text-lg font-bold text-[var(--ui-accent)]">{score}</p>
            <p className="text-xs text-[var(--text-dim)]">{band}</p>
          </div>
          <CheckCircle2 size={28} className="text-[var(--ui-accent)]" strokeWidth={2} aria-hidden />
        </div>
        <div className="mt-3">
          <CampaignCreatorScoreBar value={score} />
        </div>
      </div>

      <OrionModalSection title={t("review")}>
        <div className="campaign-creator-sidebar-card-inset campaign-creator-summary-section-card space-y-1 p-1">
          <SummaryOverviewRow icon={<Copy size={15} />} iconTone="accent" label={t("reviewType")} value={typeLabel} />
          <SummaryOverviewRow icon={<Tag size={15} />} label={t("reviewName")} value={audienceName || "—"} />
          <SummaryOverviewRow
            icon={<Building2 size={15} />}
            label={t("reviewClient")}
            value={clientName || "—"}
          />
          <SummaryOverviewRow
            icon={<MapPin size={15} />}
            iconTone="success"
            label={t("reviewCountry")}
            value={country}
          />
          {typeChoice === "custom" ? (
            <>
              <SummaryOverviewRow icon={<Globe size={15} />} label={t("reviewSource")} value={sourceLabel ?? "—"} />
              <SummaryOverviewRow
                icon={<Activity size={15} />}
                iconTone="violet"
                label={t("reviewAction")}
                value={ruleActionLabel ?? "—"}
              />
              <SummaryOverviewRow
                icon={<Users size={15} />}
                label={t("reviewWindow")}
                value={windowDays ? t("daysValue", { count: parseInt(windowDays, 10) || 0 }) : "—"}
              />
            </>
          ) : null}
          {typeChoice === "lookalike" ? (
            <>
              <SummaryOverviewRow
                icon={<Copy size={15} />}
                iconTone="accent"
                label={t("reviewSimilarity")}
                value={lookalikePct ? `${lookalikePct}%` : "—"}
              />
              <SummaryOverviewRow icon={<Users size={15} />} label={t("reviewSeedAudience")} value={seedName ?? "—"} />
            </>
          ) : null}
          {typeChoice === "saved" ? (
            <>
              <SummaryOverviewRow
                icon={<Users size={15} />}
                label={t("reviewAgeRange")}
                value={t("ageRangeValue", { min: ageMin ?? "18", max: ageMax ?? "65" })}
              />
              <SummaryOverviewRow icon={<Users size={15} />} label={t("reviewGenders")} value={genders || "—"} />
              {interests ? (
                <SummaryOverviewRow icon={<Activity size={15} />} label={t("reviewInterests")} value={interests} />
              ) : null}
            </>
          ) : null}
        </div>
      </OrionModalSection>
    </CreatorModalShell>
  );
}
