"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Image as ImageIcon,
  LayoutGrid,
  Megaphone,
  Sparkles,
  Target,
  Type,
  Users,
  Wallet
} from "lucide-react";

import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";
import { CampaignCreatorScoreBar } from "@/components/campaign-creator/CampaignCreatorScoreBar";
import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import {
  adHasMedia,
  computeDraftScore,
  getActiveAd,
  getActiveAdset,
  validateAdSetStep,
  validateAdStep
} from "@/lib/campaign-draft";
import type { PlacementConfig } from "@/lib/campaign-placements";
import { formatBRL } from "@/lib/format";
import { usePublishAssets } from "@/hooks/usePublishAssets";

function usePersonaName(personaId: string | null | undefined) {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!personaId) {
      setName(null);
      return;
    }
    fetch("/api/personas")
      .then((r) => r.json())
      .then((j: { personas?: Array<{ id: string; name: string }> }) => {
        setName(j.personas?.find((p) => p.id === personaId)?.name ?? null);
      })
      .catch(() => setName(null));
  }, [personaId]);

  return name;
}

function useZoneName(zoneId: string | null | undefined) {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!zoneId) {
      setName(null);
      return;
    }
    fetch("/api/zones")
      .then((r) => r.json())
      .then((j: { zones?: Array<{ id: string; name: string }> }) => {
        setName(j.zones?.find((z) => z.id === zoneId)?.name ?? null);
      })
      .catch(() => setName(null));
  }, [zoneId]);

  return name;
}

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

function SummaryBadge({
  children,
  tone = "accent"
}: {
  children: ReactNode;
  tone?: "accent" | "neutral" | "success";
}) {
  return (
    <span className={`campaign-creator-review-badge campaign-creator-review-badge--${tone}`}>
      {children}
    </span>
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

function SummarySourceChip({
  icon,
  label,
  muted = false
}: {
  icon: ReactNode;
  label: string;
  muted?: boolean;
}) {
  return (
    <span
      className={
        muted
          ? "campaign-creator-summary-chip campaign-creator-summary-chip--muted"
          : "campaign-creator-summary-chip campaign-creator-summary-chip--neutral"
      }
    >
      {icon}
      <span className="truncate">{label}</span>
    </span>
  );
}

function SummaryScoreRing({ score }: { score: number }) {
  const t = useTranslations("campaignCreator");
  const band = scoreBandLabel(score, t);
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
            {t("campaignScore")}
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

function formatScheduleLabel(start: string | null | undefined, end: string | null | undefined, locale: string) {
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
  const startLabel = start ? fmt.format(new Date(start)) : null;
  const endLabel = end ? fmt.format(new Date(end)) : null;
  return { startLabel, endLabel };
}

function summarizePlacements(
  placements: PlacementConfig,
  t: ReturnType<typeof useTranslations<"campaignCreator">>
) {
  if (placements.mode === "advantage_plus") return t("placementsAdvantage");
  const count = placements.platforms.length;
  if (!count) return t("placementsManual");
  return t("reviewPlacementsManualSummary", { count });
}

export function CampaignCreatorSummaryModal({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("campaignCreator");
  const tAds = useTranslations("ads");
  const locale = useLocale();
  const { payload, activeNode, clients } = useCampaignDraft();
  const { accounts } = usePublishAssets(payload.clientSlug, payload.adAccountId);
  const adset = getActiveAdset(payload);
  const ad = getActiveAd(payload);

  const personaName = usePersonaName(adset.personaId);
  const zoneName = useZoneName(adset.zoneId);
  const targetingMode = adset.targetingMode ?? "compiler";
  const customAudienceCount =
    adset.targeting.customAudienceIds.length + adset.targeting.excludedAudienceIds.length;

  const notSet = t("sidebarNotSet");
  const objectiveLabel = t(`objective_${payload.objective}`);
  const score = computeDraftScore(payload);

  const clientName = useMemo(() => {
    if (!payload.clientSlug.trim()) return null;
    return (
      clients.find((c) => c.id === payload.clientSlug || c.slug === payload.clientSlug)?.name ??
      payload.clientSlug
    );
  }, [clients, payload.clientSlug]);

  const adAccountLabel = useMemo(() => {
    if (!payload.adAccountId.trim()) return null;
    return (
      accounts.find((a) => a.metaAdAccountId === payload.adAccountId)?.label ?? payload.adAccountId
    );
  }, [accounts, payload.adAccountId]);

  const scheduleSummary = useMemo(() => {
    const { startLabel, endLabel } = formatScheduleLabel(adset.schedule.start, adset.schedule.end, locale);
    if (!startLabel && !endLabel) return t("reviewScheduleOpen");
    if (startLabel && endLabel) return `${startLabel} → ${endLabel}`;
    if (startLabel) return startLabel;
    return endLabel ?? t("reviewScheduleOpen");
  }, [adset.schedule.end, adset.schedule.start, locale, t]);

  const placementsSummary = useMemo(
    () => summarizePlacements(adset.placements, t),
    [adset.placements, t]
  );

  const clientOk = Boolean(payload.clientSlug.trim());
  const accountOk = Boolean(payload.adAccountId.trim());
  const identityOk = Boolean(payload.campaign.name.trim());
  const budgetOk = payload.campaign.dailyBudgetBRL >= 1;
  const adsetOk = !validateAdSetStep(payload);
  const adOk = !validateAdStep(payload);
  const mediaOk = payload.ads.some(adHasMedia);
  const titlesOk = payload.ads.some((a) => a.titles.filter((x) => x.trim()).length >= 2);
  const titlesCount = ad.titles.filter((x) => x.trim()).length;
  const sourcesOk = clientOk && accountOk;

  const showAdsetContext = activeNode === "adset" || activeNode === "ad" || activeNode === "review";
  const showAdContext = activeNode === "ad" || activeNode === "review";

  const audienceBadges = useMemo(() => {
    const badges: Array<{ label: string; tone: "accent" | "neutral" | "success" }> = [
      {
        label: t(`targetingMode_${targetingMode}` as "targetingMode_compiler"),
        tone: "accent"
      }
    ];

    if (targetingMode === "compiler") {
      if (personaName) badges.push({ label: personaName, tone: "success" });
      if (zoneName) badges.push({ label: zoneName, tone: "neutral" });
    } else if (adset.metaSavedAudienceId) {
      badges.push({ label: adset.metaSavedAudienceId, tone: "success" });
    }

    if (customAudienceCount > 0) {
      badges.push({
        label: t("sidebarCustomAudiencesCount", { count: customAudienceCount }),
        tone: "neutral"
      });
    }

    return badges;
  }, [
    adset.metaSavedAudienceId,
    customAudienceCount,
    personaName,
    t,
    targetingMode,
    zoneName
  ]);

  return (
    <CreatorModalShell
      open={open}
      onClose={onClose}
      title={t("sidebarContextCampaign")}
      subtitle={t("summaryModalSubtitle")}
      titleIcon={<Sparkles size={15} strokeWidth={2.25} />}
      width="md"
      hideFooter
    >
      <div className="space-y-5">
        <OrionModalSection title={t("summarySectionSources")}>
          <div className="campaign-creator-summary-source-hero">
            <div className="flex items-start gap-3">
              <span className="campaign-creator-summary-source-hero__icon">
                <Building2 size={18} strokeWidth={2.25} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge complete={sourcesOk} />
                  <SummaryBadge tone="accent">{objectiveLabel}</SummaryBadge>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <SummarySourceChip
                    icon={<Building2 size={12} strokeWidth={2.25} aria-hidden />}
                    label={clientName ?? notSet}
                    muted={!clientName}
                  />
                  <SummarySourceChip
                    icon={<CreditCard size={12} strokeWidth={2.25} aria-hidden />}
                    label={adAccountLabel ?? notSet}
                    muted={!adAccountLabel}
                  />
                </div>
              </div>
            </div>
          </div>
        </OrionModalSection>

        <OrionModalSection title={t("summarySectionChecklist")}>
          <SummaryScoreRing score={score} />
          <div className="campaign-creator-summary-checklist-wrap">
            <p className="text-[11px] font-medium text-[var(--text-dim)]">{t("summaryScoreSection")}</p>
            <div className="mt-3 space-y-3">
              <SummaryChecklistGroup
                title={t("summarySectionSources")}
                items={[
                  { label: tAds("clientLabel"), complete: clientOk },
                  { label: tAds("adAccount"), complete: accountOk }
                ]}
              />
              <SummaryChecklistGroup
                title={t("summarySectionCampaign")}
                items={[
                  { label: t("campaignSub_basics"), complete: identityOk },
                  { label: t("campaignSub_budget"), complete: budgetOk }
                ]}
              />
              <SummaryChecklistGroup
                title={t("summarySectionAudience")}
                items={[{ label: t("summaryScoreAdset"), complete: adsetOk }]}
              />
              <SummaryChecklistGroup
                title={t("summarySectionAd")}
                items={[
                  { label: t("summaryScoreAd"), complete: adOk },
                  { label: t("summaryScoreMedia"), complete: mediaOk },
                  { label: t("summaryScoreTitles"), complete: titlesOk }
                ]}
              />
            </div>
          </div>
        </OrionModalSection>

        <OrionModalSection title={t("summarySectionCampaign")}>
          <div className="campaign-creator-summary-metric-row mt-2">
            <span className="campaign-creator-summary-metric-row__label">{t("summaryBudgetDaily")}</span>
            <span className="campaign-creator-summary-metric-row__value">
              {formatBRL(payload.campaign.dailyBudgetBRL, locale)}
            </span>
          </div>
          <SummarySectionCard>
            <SummaryOverviewRow
              icon={<Megaphone size={15} strokeWidth={2.25} aria-hidden />}
              label={t("summaryCampaignName")}
              value={payload.campaign.name || notSet}
            />
            <SummaryOverviewRow
              icon={<Target size={15} strokeWidth={2.25} aria-hidden />}
              iconTone="accent"
              label={t("campaignSub_objective")}
              value={<SummaryBadge tone="accent">{objectiveLabel}</SummaryBadge>}
            />
            <SummaryOverviewRow
              icon={<Wallet size={15} strokeWidth={2.25} aria-hidden />}
              iconTone="violet"
              label={t("summaryBuyingType")}
              value={payload.campaign.budgetLevel === "campaign" ? "CBO" : "ABO"}
            />
            <SummaryOverviewRow
              icon={<CalendarClock size={15} strokeWidth={2.25} aria-hidden />}
              label={t("summarySchedule")}
              value={scheduleSummary}
            />
            <SummaryOverviewRow
              icon={<LayoutGrid size={15} strokeWidth={2.25} aria-hidden />}
              iconTone="success"
              label={t("summaryPlacements")}
              value={placementsSummary}
            />
          </SummarySectionCard>
        </OrionModalSection>

        {showAdsetContext ? (
          <OrionModalSection title={t("summarySectionAudience")}>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <StatusBadge complete={adsetOk} />
            </div>
            <SummarySectionCard>
              <div className="py-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {audienceBadges.map((badge) => (
                    <SummaryBadge key={badge.label} tone={badge.tone}>
                      {badge.label}
                    </SummaryBadge>
                  ))}
                </div>
              </div>
              <SummaryOverviewRow
                icon={<Users size={15} strokeWidth={2.25} aria-hidden />}
                iconTone="accent"
                label={t("adsetName")}
                value={adset.name || notSet}
              />
              {targetingMode === "compiler" ? (
                <>
                  <SummaryOverviewRow
                    icon={<Target size={15} strokeWidth={2.25} aria-hidden />}
                    iconTone="success"
                    label={t("selectPersona")}
                    value={personaName || notSet}
                  />
                  <SummaryOverviewRow
                    icon={<LayoutGrid size={15} strokeWidth={2.25} aria-hidden />}
                    label={t("selectZone")}
                    value={zoneName || notSet}
                  />
                </>
              ) : null}
              {adset.metaSavedAudienceId && targetingMode !== "compiler" ? (
                <SummaryOverviewRow
                  icon={<ClipboardList size={15} strokeWidth={2.25} aria-hidden />}
                  label={t("savedAudiencesTitle")}
                  value={adset.metaSavedAudienceId}
                />
              ) : null}
            </SummarySectionCard>
          </OrionModalSection>
        ) : null}

        {showAdContext ? (
          <OrionModalSection title={t("summarySectionAd")}>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <StatusBadge complete={adOk && mediaOk} />
              {mediaOk ? (
                <SummaryBadge tone="success">
                  {ad.format === "video"
                    ? t("videosSelected", { count: ad.videoIds.length })
                    : t("imagesSelected", { count: ad.imageHashes.length })}
                </SummaryBadge>
              ) : null}
            </div>
            <SummarySectionCard>
              <SummaryOverviewRow
                icon={<Megaphone size={15} strokeWidth={2.25} aria-hidden />}
                label={t("adName")}
                value={ad.name || notSet}
              />
              <SummaryOverviewRow
                icon={<Type size={15} strokeWidth={2.25} aria-hidden />}
                iconTone={titlesOk ? "success" : "neutral"}
                label={t("summaryTitlesCount")}
                value={
                  <span className={titlesOk ? "font-semibold text-emerald-700 dark:text-emerald-400" : undefined}>
                    {String(titlesCount)}
                  </span>
                }
              />
              <SummaryOverviewRow
                icon={<ImageIcon size={15} strokeWidth={2.25} aria-hidden />}
                iconTone={adHasMedia(ad) ? "success" : "neutral"}
                label={t("summaryScoreMedia")}
                value={
                  adHasMedia(ad)
                    ? ad.format === "video"
                      ? t("videosSelected", { count: ad.videoIds.length })
                      : t("imagesSelected", { count: ad.imageHashes.length })
                    : t("noMedia")
                }
              />
            </SummarySectionCard>
          </OrionModalSection>
        ) : null}
      </div>
    </CreatorModalShell>
  );
}
