"use client";

import { useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  Briefcase,
  CheckCircle2,
  Hash,
  ShieldOff,
  Sparkles,
  Target,
  User,
  Users,
  Waves
} from "lucide-react";

import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";
import { CampaignCreatorScoreBar } from "@/components/campaign-creator/CampaignCreatorScoreBar";
import {
  buildPersonaDraftScoreChecklist,
  computePersonaDraftScore,
  type PersonaDraftScoreInput
} from "@/lib/persona-draft-score";

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

function SummarySectionCard({ children }: { children: ReactNode }) {
  return (
    <div className="campaign-creator-sidebar-card-inset campaign-creator-summary-section-card">
      {children}
    </div>
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

function StatusBadge({ complete }: { complete: boolean }) {
  const t = useTranslations("campaignCreator");
  return (
    <span
      className={
        complete
          ? "campaign-creator-summary-status-badge campaign-creator-summary-status-badge--complete"
          : "campaign-creator-summary-status-badge campaign-creator-summary-status-badge--incomplete"
      }
    >
      {complete ? t("summaryBadgeComplete") : t("summaryBadgeIncomplete")}
    </span>
  );
}

function SummaryScoreRing({ score }: { score: number }) {
  const tAud = useTranslations("audiences");
  const tCc = useTranslations("campaignCreator");
  const band = scoreBandLabel(score, tCc);
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="campaign-creator-summary-score-panel">
      <div className="campaign-creator-summary-score-ring">
        <svg className="campaign-creator-summary-score-ring__svg" viewBox="0 0 64 64" aria-hidden>
          <circle cx="32" cy="32" r="28" fill="none" stroke="var(--border-color)" strokeWidth="4.5" />
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="var(--ui-accent)"
            strokeWidth="4.5"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <span className="campaign-creator-summary-score-ring__value">{score}</span>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-dimmer)]">
            {tAud("personaScore")}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-[var(--text-main)]">{band}</p>
        </div>
        <CampaignCreatorScoreBar value={score} />
      </div>
    </div>
  );
}

function SummaryChecklistItem({ label, complete }: { label: string; complete: boolean }) {
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

function SummaryChecklistGroup({
  title,
  items
}: {
  title: string;
  items: Array<{ label: string; complete: boolean }>;
}) {
  return (
    <div>
      <p className="campaign-creator-summary-checklist-group__label">{title}</p>
      <div className="campaign-creator-summary-checklist-grid">
        {items.map((item) => (
          <SummaryChecklistItem key={item.label} label={item.label} complete={item.complete} />
        ))}
      </div>
    </div>
  );
}

function truncate(value: string, max = 120): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

function resolvedPersonaName(input: PersonaDraftScoreInput): string {
  const custom = input.savePersonaName.trim();
  if (custom) return custom;
  return (
    input.targetProfile.trim().slice(0, 120) || input.businessDescription.trim().slice(0, 80)
  );
}

export function PersonaCreatorSummaryModal({
  open,
  onClose,
  scoreInput,
  manualMode
}: {
  open: boolean;
  onClose: () => void;
  scoreInput: PersonaDraftScoreInput;
  manualMode: boolean;
}) {
  const tAud = useTranslations("audiences");
  const tCc = useTranslations("campaignCreator");
  const notSet = tCc("sidebarNotSet");
  const score = computePersonaDraftScore(scoreInput);
  const checklist = buildPersonaDraftScoreChecklist(scoreInput);

  const genderLabel = useMemo(() => {
    if (scoreInput.gender === "male") return tCc("genderMale");
    if (scoreInput.gender === "female") return tCc("genderFemale");
    return tCc("genderAll");
  }, [scoreInput.gender, tCc]);

  const demographicsSummary = `${scoreInput.ageMin}–${scoreInput.ageMax} · ${genderLabel}`;
  const personaName = resolvedPersonaName(scoreInput);
  const briefingComplete =
    checklist.demographics &&
    checklist.business &&
    checklist.profile &&
    checklist.behaviors &&
    checklist.lifestyle;
  const refinementComplete = checklist.exclusions;
  const reviewComplete = checklist.finish;

  return (
    <CreatorModalShell
      open={open}
      onClose={onClose}
      title={tAud("sidebarContextPersona")}
      subtitle={tCc("summaryModalSubtitle")}
      titleIcon={<Sparkles size={15} strokeWidth={2.25} />}
      width="md"
      hideFooter
    >
      <div className="space-y-5">
        <OrionModalSection title={tCc("summarySectionChecklist")}>
          <SummaryScoreRing score={score} />
          <div className="campaign-creator-summary-checklist-wrap">
            <p className="text-[11px] font-medium text-[var(--text-dim)]">{tCc("summaryScoreSection")}</p>
            <div className="mt-3 space-y-3">
              <SummaryChecklistGroup
                title={tAud("personaSectionIdentityTitle")}
                items={[
                  { label: tAud("personaScoreCheckDemographics"), complete: checklist.demographics }
                ]}
              />
              <SummaryChecklistGroup
                title={tAud("personaSectionCommercialTitle")}
                items={[
                  { label: tCc("aiAudienceBusiness"), complete: checklist.business },
                  { label: tCc("aiAudienceProfile"), complete: checklist.profile }
                ]}
              />
              <SummaryChecklistGroup
                title={tAud("personaSectionLaunchTitle")}
                items={[
                  { label: tCc("aiAudienceBehaviors"), complete: checklist.behaviors },
                  { label: tCc("aiAudienceLifestyle"), complete: checklist.lifestyle }
                ]}
              />
              <SummaryChecklistGroup
                title={tAud("personaMacroRefinement")}
                items={[
                  { label: tCc("aiAudienceExclusions"), complete: checklist.exclusions }
                ]}
              />
              <SummaryChecklistGroup
                title={tAud("personaMacroReview")}
                items={[
                  {
                    label: manualMode ? tAud("personaManualName") : tAud("personaStepPreview"),
                    complete: checklist.finish
                  }
                ]}
              />
            </div>
          </div>
        </OrionModalSection>

        <OrionModalSection title={tAud("personaSummarySectionBriefing")}>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StatusBadge complete={briefingComplete} />
          </div>
          <SummarySectionCard>
            <SummaryOverviewRow
              icon={<Users size={15} strokeWidth={2.25} aria-hidden />}
              iconTone="accent"
              label={tAud("personaScoreCheckDemographics")}
              value={demographicsSummary}
            />
            <SummaryOverviewRow
              icon={<Briefcase size={15} strokeWidth={2.25} aria-hidden />}
              label={tCc("aiAudienceBusiness")}
              value={truncate(scoreInput.businessDescription) || notSet}
            />
            <SummaryOverviewRow
              icon={<User size={15} strokeWidth={2.25} aria-hidden />}
              iconTone="violet"
              label={tCc("aiAudienceProfile")}
              value={truncate(scoreInput.targetProfile) || notSet}
            />
            <SummaryOverviewRow
              icon={<Target size={15} strokeWidth={2.25} aria-hidden />}
              iconTone="success"
              label={tCc("aiAudienceBehaviors")}
              value={truncate(scoreInput.behaviors) || notSet}
            />
            <SummaryOverviewRow
              icon={<Waves size={15} strokeWidth={2.25} aria-hidden />}
              label={tCc("aiAudienceLifestyle")}
              value={truncate(scoreInput.lifestyleHints) || notSet}
            />
          </SummarySectionCard>
        </OrionModalSection>

        <OrionModalSection title={tAud("personaMacroRefinement")}>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StatusBadge complete={refinementComplete} />
          </div>
          <SummarySectionCard>
            <SummaryOverviewRow
              icon={<ShieldOff size={15} strokeWidth={2.25} aria-hidden />}
              label={tCc("aiAudienceExclusions")}
              value={truncate(scoreInput.exclusionHints) || notSet}
            />
          </SummarySectionCard>
        </OrionModalSection>

        <OrionModalSection title={tAud("personaMacroReview")}>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StatusBadge complete={reviewComplete} />
          </div>
          <SummarySectionCard>
            <SummaryOverviewRow
              icon={<Hash size={15} strokeWidth={2.25} aria-hidden />}
              iconTone="accent"
              label={manualMode ? tAud("personaManualName") : tAud("personaStepPreview")}
              value={
                manualMode
                  ? personaName || notSet
                  : scoreInput.hasPersonaPreview || scoreInput.hasSuggestion
                    ? tAud("personaSummaryPreviewReady")
                    : notSet
              }
            />
          </SummarySectionCard>
        </OrionModalSection>
      </div>
    </CreatorModalShell>
  );
}
