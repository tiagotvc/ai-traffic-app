"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  LayoutGrid,
  Megaphone,
  Sparkles,
  Target,
  Users,
  Wallet
} from "lucide-react";

import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { ZoneGeoReviewPanel } from "@/components/campaign-creator/ZoneGeoReviewPanel";
import { countPublishEntities, getActiveAdset, resolveAdTargetAdsets } from "@/lib/campaign-draft";
import type { PlacementConfig } from "@/lib/campaign-placements";
import { formatBRL } from "@/lib/format";
import { usePublishAssets } from "@/hooks/usePublishAssets";
import { CampaignCreatorUxMobileSummary } from "@/uxpilot-ui/adapters/CampaignCreatorUxMobileSummary";

function OrionSectionLabel({ children }: { children: ReactNode }) {
  return (
    <h4 className="campaign-creator-orion-section-label">{children}</h4>
  );
}

function ReviewOverviewRow({
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
      <span className={`campaign-creator-review-overview-row__icon campaign-creator-review-overview-row__icon--${iconTone}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="campaign-creator-review-summary-row__label">{label}</p>
        <div className="campaign-creator-review-summary-row__value">{value}</div>
      </div>
    </div>
  );
}

function ReviewBadge({
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
  if (placements.mode === "advantage_plus") {
    return t("placementsAdvantage");
  }
  const count = placements.platforms.length;
  if (!count) return t("placementsManual");
  return t("reviewPlacementsManualSummary", { count });
}

export function ReviewStep() {
  const t = useTranslations("campaignCreator");
  const tAds = useTranslations("ads");
  const tAi = useTranslations("campaignCreator.ai");
  const locale = useLocale();
  const { payload, setActiveNode, clients } = useCampaignDraft();
  const { accounts } = usePublishAssets(payload.clientSlug, payload.adAccountId);
  const counts = countPublishEntities(payload);
  const adset = getActiveAdset(payload);
  const [personaName, setPersonaName] = useState<string | null>(null);
  const [zoneName, setZoneName] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  const isAiDraft = payload.meta?.creationMode === "ai";
  const rationale = payload.meta?.aiRationale;
  const notSet = t("sidebarNotSet");
  const targetingMode = adset.targetingMode ?? "compiler";
  const objectiveLabel = t(`objective_${payload.objective}`);

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

  useEffect(() => {
    if (adset.personaId) {
      fetch(`/api/personas/${adset.personaId}`)
        .then((r) => r.json())
        .then((j: { persona?: { name: string } }) => setPersonaName(j.persona?.name ?? adset.personaId ?? null))
        .catch(() => setPersonaName(adset.personaId ?? null));
    } else setPersonaName(null);
    if (adset.zoneId) {
      fetch(`/api/zones/${adset.zoneId}`)
        .then((r) => r.json())
        .then((j: { zone?: { name: string } }) => setZoneName(j.zone?.name ?? adset.zoneId ?? null))
        .catch(() => setZoneName(adset.zoneId ?? null));
    } else setZoneName(null);
  }, [adset.personaId, adset.zoneId]);

  const segmentationBadges = useMemo(() => {
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

    const customCount =
      adset.targeting.customAudienceIds.length + adset.targeting.excludedAudienceIds.length;
    if (customCount > 0) {
      badges.push({
        label: t("sidebarCustomAudiencesCount", { count: customCount }),
        tone: "neutral"
      });
    }

    return badges;
  }, [
    adset.metaSavedAudienceId,
    adset.targeting.customAudienceIds.length,
    adset.targeting.excludedAudienceIds.length,
    personaName,
    t,
    targetingMode,
    zoneName
  ]);

  async function regenerateWithAi() {
    if (!payload.clientSlug || !payload.adAccountId) return;
    setRegenerating(true);
    setRegenError(null);
    try {
      const res = await fetch("/api/campaign-creator/ai-generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: payload.clientSlug,
          adAccountId: payload.adAccountId,
          locale: document.documentElement.lang || "pt-BR"
        })
      });
      const j = (await res.json()) as { ok?: boolean; draftId?: string; error?: string; message?: string };
      if (!j.ok || !j.draftId) {
        throw new Error(j.message ?? j.error ?? tAi("generateFailed"));
      }
      window.location.href = `/campaigns/new/${j.draftId}?review=1`;
    } catch (e) {
      setRegenError(e instanceof Error ? e.message : tAi("generateFailed"));
    } finally {
      setRegenerating(false);
    }
  }

  const budgetLabel = `${formatBRL(payload.campaign.dailyBudgetBRL, locale)} · ${
    payload.campaign.budgetLevel === "campaign" ? "CBO" : "ABO"
  }`;

  return (
    <div className="campaign-creator-section space-y-5">
      {isAiDraft && rationale ? (
        <section className="campaign-creator-card campaign-creator-copy-card">
          <div className="flex min-w-0 flex-1 items-start gap-2.5">
            <Sparkles size={18} className="mt-0.5 shrink-0 text-[var(--ui-accent-fg,var(--violet))]" aria-hidden />
            <div className="min-w-0 flex-1">
              <h4 className="campaign-creator-section-title">{tAi("reviewRationaleTitle")}</h4>
              <p className="mt-1 text-sm text-[var(--text-main)]">{rationale.summary}</p>
              {payload.meta?.aiStrategy ? (
                <p className="mt-2 text-xs text-[var(--text-dim)]">
                  {tAi("reviewStrategy")}: {tAi(`strategy_${payload.meta.aiStrategy}`)}
                </p>
              ) : null}
              {payload.meta?.referenceCampaignId ? (
                <p className="mt-1 text-xs text-[var(--text-dim)]">
                  {tAi("reviewReference")}: {payload.meta.referenceCampaignId}
                </p>
              ) : null}
              <div className="mt-3 space-y-2 text-xs text-[var(--text-dim)]">
                <p>
                  <span className="font-medium text-[var(--text-main)]">{tAi("reviewAudience")}:</span>{" "}
                  {rationale.audienceReason}
                </p>
                <p>
                  <span className="font-medium text-[var(--text-main)]">{tAi("reviewCopy")}:</span>{" "}
                  {rationale.copyReason}
                </p>
                {rationale.signals.length ? (
                  <ul className="mt-1 list-inside list-disc">
                    {rationale.signals.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
              {payload.meta?.suggestedAudiences?.length ? (
                <div className="mt-3">
                  <p className="text-xs font-medium text-[var(--text-main)]">
                    {tAi("suggestedAudiences")}
                  </p>
                  <ul className="mt-1 space-y-1 text-xs text-[var(--text-dim)]">
                    {payload.meta.suggestedAudiences.map((a) => (
                      <li key={`${a.type}-${a.name}`}>
                        <span className="font-medium">{a.name}</span> ({a.type}) — {a.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="ui-btn-secondary text-xs"
                  onClick={() => setActiveNode("adset")}
                >
                  {tAi("editAdset")}
                </button>
                <button
                  type="button"
                  className="ui-btn-secondary text-xs"
                  onClick={() => setActiveNode("ad")}
                >
                  {tAi("editAd")}
                </button>
                <button
                  type="button"
                  className="ui-btn-secondary text-xs"
                  disabled={regenerating}
                  onClick={() => void regenerateWithAi()}
                >
                  {regenerating ? tAi("regenerating") : tAi("regenerate")}
                </button>
              </div>
              {regenError ? <p className="mt-2 text-xs text-red-600">{regenError}</p> : null}
            </div>
          </div>
        </section>
      ) : null}

      <header className="campaign-creator-budget-header">
        <h3 className="campaign-creator-budget-header__title">{t("reviewSummaryTitle")}</h3>
        <p className="campaign-creator-budget-header__subtitle">{t("reviewHint")}</p>
      </header>

      <section className="space-y-2">
        <OrionSectionLabel>{t("reviewSummarySection")}</OrionSectionLabel>
        <div className="campaign-creator-sidebar-card-inset px-3 py-1">
          <ReviewOverviewRow
            icon={<Megaphone size={15} strokeWidth={2.25} aria-hidden />}
            label={t("campaignName")}
            value={payload.campaign.name || notSet}
          />
          <ReviewOverviewRow
            icon={<Target size={15} strokeWidth={2.25} aria-hidden />}
            iconTone="accent"
            label={t("objective")}
            value={<ReviewBadge tone="accent">{objectiveLabel}</ReviewBadge>}
          />
          <ReviewOverviewRow
            icon={<Building2 size={15} strokeWidth={2.25} aria-hidden />}
            label={tAds("clientLabel")}
            value={clientName ?? notSet}
          />
          <ReviewOverviewRow
            icon={<CreditCard size={15} strokeWidth={2.25} aria-hidden />}
            label={tAds("adAccount")}
            value={adAccountLabel ?? notSet}
          />
          <ReviewOverviewRow
            icon={<Wallet size={15} strokeWidth={2.25} aria-hidden />}
            iconTone="violet"
            label={t("budgetSection")}
            value={<span className="font-semibold text-[var(--ui-accent)]">{budgetLabel}</span>}
          />
          <ReviewOverviewRow
            icon={<ClipboardList size={15} strokeWidth={2.25} aria-hidden />}
            label={t("buyingType")}
            value={
              payload.buyingType === "reservation" ? t("buyingReservation") : t("buyingAuction")
            }
          />
          <ReviewOverviewRow
            icon={<LayoutGrid size={15} strokeWidth={2.25} aria-hidden />}
            iconTone="success"
            label={t("reviewMetaEntities")}
            value={t("reviewMetaTotal", { adsets: counts.adsets, ads: counts.ads })}
          />
        </div>
      </section>

      <section className="space-y-2">
        <OrionSectionLabel>{t("reviewTargetingSummary")}</OrionSectionLabel>
        <div className="campaign-creator-sidebar-card-inset px-3 py-3">
          <div className="flex flex-wrap gap-1.5">
            {segmentationBadges.map((badge) => (
              <ReviewBadge key={badge.label} tone={badge.tone}>
                {badge.label}
              </ReviewBadge>
            ))}
          </div>
          {adset.name.trim() ? (
            <p className="mt-2.5 text-xs text-[var(--text-dim)]">
              <span className="font-medium text-[var(--text-main)]">{t("adsetName")}:</span> {adset.name}
            </p>
          ) : null}
        </div>
      </section>

      <section className="space-y-2">
        <OrionSectionLabel>{t("reviewSchedulePlacements")}</OrionSectionLabel>
        <div className="campaign-creator-sidebar-card-inset px-3 py-1">
          <ReviewOverviewRow
            icon={<CalendarClock size={15} strokeWidth={2.25} aria-hidden />}
            label={t("scheduleSection")}
            value={scheduleSummary}
          />
          <ReviewOverviewRow
            icon={<LayoutGrid size={15} strokeWidth={2.25} aria-hidden />}
            iconTone="accent"
            label={t("placements")}
            value={placementsSummary}
          />
        </div>
      </section>

      {adset.zoneId ? (
        <ZoneGeoReviewPanel
          zoneId={adset.zoneId}
          className="campaign-creator-card campaign-creator-budget-side-card !p-3.5"
        />
      ) : null}

      <section className="space-y-2">
        <OrionSectionLabel>{t("reviewMatrixTitle")}</OrionSectionLabel>
        <p className="text-xs text-[var(--text-dim)]">{t("reviewMatrixHint")}</p>
        <div className="campaign-creator-review-matrix">
          <table>
            <thead>
              <tr className="border-b border-[var(--border-color)] text-[var(--text-dimmer)]">
                <th className="px-3 py-2.5 pr-2 text-[11px] font-semibold uppercase tracking-wide">
                  {t("treeAdset")}
                </th>
                {payload.ads.map((ad) => (
                  <th
                    key={ad.id}
                    className="px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide"
                  >
                    {ad.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payload.adsets.map((rowAdset) => (
                <tr
                  key={rowAdset.id}
                  className="border-b border-[var(--border-color)] transition-colors last:border-b-0 hover:bg-[var(--row-hover)]"
                >
                  <td className="px-3 py-2.5 pr-2 font-medium text-[var(--text-main)]">{rowAdset.name}</td>
                  {payload.ads.map((ad) => {
                    const targets = resolveAdTargetAdsets(payload, ad);
                    const willPublish = targets.some((a) => a.id === rowAdset.id);
                    return (
                      <td key={ad.id} className="px-2 py-2.5 text-center">
                        {willPublish ? (
                          <span className="inline-flex items-center justify-center" title={t("reviewWillPublish")}>
                            <CheckCircle2
                              size={16}
                              strokeWidth={2.25}
                              className="text-emerald-600 dark:text-emerald-400"
                              aria-hidden
                            />
                          </span>
                        ) : (
                          <span className="text-[var(--text-dimmer)]">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-[var(--text-dim)]">{t("publishPausedNote")}</p>

      <CampaignCreatorUxMobileSummary />
    </div>
  );
}
