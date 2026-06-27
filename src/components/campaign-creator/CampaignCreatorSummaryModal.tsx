"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Tag,
  Target,
  Users
} from "lucide-react";

import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";
import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import {
  adHasMedia,
  getActiveAd,
  getActiveAdset,
  validateAdSetStep,
  validateAdStep
} from "@/lib/campaign-draft";

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

function SummarySection({
  icon,
  title,
  children
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 text-[var(--text-dim)]">
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-wide">{title}</span>
      </div>
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] px-3">
        {children}
      </div>
    </section>
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
    <div className="border-b border-[var(--border-color)]/60 py-2.5 last:border-b-0 first:pt-2.5 last:pb-2.5">
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

function SummaryChecklistRow({ label, complete }: { label: string; complete: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--border-color)]/60 py-2.5 last:border-b-0 first:pt-2.5 last:pb-2.5">
      <span className="text-sm text-[var(--text-main)]">{label}</span>
      {complete ? (
        <CheckCircle2 size={18} strokeWidth={2.25} className="shrink-0 text-[var(--success)]" aria-hidden />
      ) : (
        <AlertTriangle size={18} strokeWidth={2.25} className="shrink-0 text-amber-500" aria-hidden />
      )}
    </div>
  );
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
  const { payload, activeNode } = useCampaignDraft();
  const adset = getActiveAdset(payload);
  const ad = getActiveAd(payload);

  const personaName = usePersonaName(adset.personaId);
  const zoneName = useZoneName(adset.zoneId);
  const targetingMode = adset.targetingMode ?? "compiler";
  const customAudienceCount =
    adset.targeting.customAudienceIds.length + adset.targeting.excludedAudienceIds.length;

  const notSet = t("sidebarNotSet");
  const objectiveLabel = t(`objective_${payload.objective}`);

  const clientOk = Boolean(payload.clientSlug.trim());
  const accountOk = Boolean(payload.adAccountId.trim());
  const identityOk = Boolean(payload.campaign.name.trim());
  const budgetOk = payload.campaign.dailyBudgetBRL >= 1;
  const adsetOk = !validateAdSetStep(payload);
  const adOk = !validateAdStep(payload);
  const mediaOk = payload.ads.some(adHasMedia);
  const titlesOk = payload.ads.some((a) => a.titles.filter((x) => x.trim()).length >= 2);

  const showAdsetContext = activeNode === "adset" || activeNode === "ad" || activeNode === "review";
  const showAdContext = activeNode === "ad" || activeNode === "review";

  return (
    <CreatorModalShell
      open={open}
      onClose={onClose}
      title={t("sidebarContextCampaign")}
      subtitle={t("summaryModalSubtitle")}
      titleIcon={<ClipboardList size={15} strokeWidth={2.25} />}
      width="md"
      hideFooter
    >
      <div className="space-y-5">
        <SummarySection icon={<ClipboardList size={14} aria-hidden />} title={t("sidebarContextCampaign")}>
          <SummaryRow label={t("campaignSub_objective")} value={objectiveLabel} />
          <SummaryChecklistRow label={tAds("clientLabel")} complete={clientOk} />
          <SummaryChecklistRow label={tAds("adAccount")} complete={accountOk} />
          <SummaryChecklistRow label={t("campaignSub_basics")} complete={identityOk} />
          <SummaryChecklistRow label={t("campaignSub_budget")} complete={budgetOk} />
        </SummarySection>

        <SummarySection icon={<Target size={14} aria-hidden />} title={t("summaryScoreSection")}>
          <SummaryChecklistRow label={t("summaryScoreAdset")} complete={adsetOk} />
          <SummaryChecklistRow label={t("summaryScoreAd")} complete={adOk} />
          <SummaryChecklistRow label={t("summaryScoreMedia")} complete={mediaOk} />
          <SummaryChecklistRow label={t("summaryScoreTitles")} complete={titlesOk} />
        </SummarySection>

        {showAdsetContext ? (
          <SummarySection icon={<Users size={14} aria-hidden />} title={t("sidebarContextAdset")}>
            <SummaryRow label={t("adsetName")} value={adset.name || notSet} dimmed={!adset.name.trim()} />
            <SummaryRow
              label={t("sidebarTargetingMode")}
              value={t(`targetingMode_${targetingMode}` as "targetingMode_compiler")}
            />
            {targetingMode === "compiler" ? (
              <>
                <SummaryRow
                  label={t("selectPersona")}
                  value={personaName || notSet}
                  dimmed={!personaName}
                />
                <SummaryRow label={t("selectZone")} value={zoneName || notSet} dimmed={!zoneName} />
              </>
            ) : null}
            {customAudienceCount > 0 ? (
              <SummaryRow
                label={t("savedAudiencesTitle")}
                value={t("sidebarCustomAudiencesCount", { count: customAudienceCount })}
              />
            ) : null}
          </SummarySection>
        ) : null}

        {showAdContext ? (
          <SummarySection icon={<Tag size={14} aria-hidden />} title={t("sidebarContextAd")}>
            <SummaryRow label={t("adsetName")} value={adset.name || notSet} dimmed={!adset.name.trim()} />
            <SummaryRow
              label={t("treeAd")}
              value={
                adHasMedia(ad)
                  ? ad.format === "video"
                    ? t("videosSelected", { count: ad.videoIds.length })
                    : t("imagesSelected", { count: ad.imageHashes.length })
                  : t("noMedia")
              }
              dimmed={!adHasMedia(ad)}
            />
          </SummarySection>
        ) : null}
      </div>
    </CreatorModalShell>
  );
}
