"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bookmark, Building2, Tag, Target, Users, Wallet } from "lucide-react";

import { ZoneGeoReviewPanel } from "@/components/campaign-creator/ZoneGeoReviewPanel";
import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { computeWizardProgressPercent } from "@/uxpilot-ui/adapters/CampaignCreatorUxChrome";
import { adHasMedia, computeDraftScore, getActiveAd, getActiveAdset } from "@/lib/campaign-draft";

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

function SidebarProgressCard() {
  const t = useTranslations("campaignCreator");
  const { payload, activeNode, addAdMode, objectiveChosen } = useCampaignDraft();
  const onObjectivePhase = !addAdMode && !objectiveChosen;
  const stepPercent = computeWizardProgressPercent({ onObjectivePhase, addAdMode, activeNode });
  const score = computeDraftScore(payload);
  const circumference = 2 * Math.PI * 32;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] p-4">
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
        <p className="text-xs leading-relaxed text-[var(--text-dim)]">{t("scoreHint")}</p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--surface-bg)]">
        <div
          className="h-full rounded-full bg-[var(--ui-accent)] transition-all"
          style={{ width: `${stepPercent}%` }}
        />
      </div>
    </div>
  );
}

function SidebarSummaryCard({
  title,
  icon,
  children
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
          {icon}
        </span>
        <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">{title}</h3>
      </div>
      <div className="space-y-0 text-xs">{children}</div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  dimmed = false
}: {
  label: string;
  value: React.ReactNode;
  dimmed?: boolean;
}) {
  return (
    <div className="border-b border-[var(--border-color)]/60 py-2 last:border-b-0 last:pb-0 first:pt-0">
      <p className="text-[11px] text-[var(--text-dimmer)]">{label}</p>
      <p
        className={
          dimmed
            ? "mt-0.5 text-sm italic text-[var(--text-dim)]"
            : "mt-0.5 text-sm font-medium text-[var(--text-main)]"
        }
      >
        {value}
      </p>
    </div>
  );
}

export function CampaignCreatorUxSidebar() {
  const t = useTranslations("campaignCreator");
  const tAds = useTranslations("ads");
  const { payload, activeNode, clients } = useCampaignDraft();
  const adset = getActiveAdset(payload);
  const ad = getActiveAd(payload);

  const clientName = clients.find((c) => c.id === payload.clientSlug)?.name;
  const accountLabel = payload.adAccountId || null;
  const personaName = usePersonaName(adset.personaId);
  const zoneName = useZoneName(adset.zoneId);
  const targetingMode = adset.targetingMode ?? "compiler";
  const customAudienceCount =
    adset.targeting.customAudienceIds.length + adset.targeting.excludedAudienceIds.length;

  const notSet = t("sidebarNotSet");

  return (
    <div className="space-y-3 py-1">
      <SidebarProgressCard />

      {activeNode === "campaign" || activeNode === "review" ? (
        <>
          <SidebarSummaryCard title={t("campaignSub_client")} icon={<Building2 size={14} />}>
            <SummaryRow label={tAds("clientLabel")} value={clientName || notSet} dimmed={!clientName} />
          </SidebarSummaryCard>
          <SidebarSummaryCard title={t("campaignSub_account")} icon={<Users size={14} />}>
            <SummaryRow label={tAds("adAccount")} value={accountLabel || notSet} dimmed={!accountLabel} />
          </SidebarSummaryCard>
          <SidebarSummaryCard title={t("campaignSub_basics")} icon={<Tag size={14} />}>
            <SummaryRow label={t("campaignName")} value={payload.campaign.name || notSet} />
            <SummaryRow
              label={t("objective")}
              value={payload.objective ? t(`objective_${payload.objective}`) : notSet}
            />
          </SidebarSummaryCard>
          <SidebarSummaryCard title={t("campaignSub_budget")} icon={<Wallet size={14} />}>
            <SummaryRow
              label={tAds("dailyBudget")}
              value={
                payload.campaign.dailyBudgetBRL > 0
                  ? t("sidebarBudgetValue", { value: payload.campaign.dailyBudgetBRL })
                  : notSet
              }
            />
            <SummaryRow
              label={t("budgetSection")}
              value={
                payload.campaign.budgetLevel === "campaign"
                  ? t("budgetCbo")
                  : payload.campaign.budgetLevel === "adset"
                    ? t("budgetAbo")
                    : notSet
              }
            />
          </SidebarSummaryCard>
        </>
      ) : null}

      {activeNode === "adset" ? (
        <>
          <SidebarSummaryCard title={t("adsetSub_basics")} icon={<Target size={14} />}>
            <SummaryRow label={t("adsetName")} value={adset.name || notSet} />
          </SidebarSummaryCard>
          <SidebarSummaryCard title={t("sidebarTargetingMode")} icon={<Users size={14} />}>
            <SummaryRow
              label={t("sidebarTargetingMode")}
              value={t(`targetingMode_${targetingMode}` as "targetingMode_compiler")}
            />
          </SidebarSummaryCard>
          {targetingMode === "compiler" ? (
            <SidebarSummaryCard title={t("targetingMode_compiler")} icon={<Target size={14} />}>
              <SummaryRow label={t("selectPersona")} value={personaName || notSet} />
              <SummaryRow label={t("selectZone")} value={zoneName || notSet} />
            </SidebarSummaryCard>
          ) : null}
          {customAudienceCount > 0 ? (
            <SidebarSummaryCard title={t("savedAudiencesTitle")} icon={<Bookmark size={14} />}>
              <SummaryRow
                label={t("savedAudiencesTitle")}
                value={t("sidebarCustomAudiencesCount", { count: customAudienceCount })}
              />
            </SidebarSummaryCard>
          ) : null}
          {adset.zoneId ? (
            <ZoneGeoReviewPanel zoneId={adset.zoneId} className="rounded-xl" />
          ) : null}
        </>
      ) : null}

      {activeNode === "ad" || activeNode === "review" ? (
        <>
          <SidebarSummaryCard title={t("treeAdset")} icon={<Target size={14} />}>
            <SummaryRow label={t("adsetName")} value={adset.name || notSet} />
          </SidebarSummaryCard>
          <SidebarSummaryCard title={t("treeAd")} icon={<Tag size={14} />}>
            <SummaryRow
              label={t("treeAd")}
              value={
                adHasMedia(ad)
                  ? ad.format === "video"
                    ? t("videosSelected", { count: ad.videoIds.length })
                    : t("imagesSelected", { count: ad.imageHashes.length })
                  : t("noMedia")
              }
            />
          </SidebarSummaryCard>
        </>
      ) : null}
    </div>
  );
}
