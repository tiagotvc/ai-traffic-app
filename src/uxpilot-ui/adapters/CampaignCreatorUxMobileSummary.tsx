"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Tag,
  Target,
  Wallet
} from "lucide-react";

import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { computeWizardProgressPercent } from "@/uxpilot-ui/adapters/CampaignCreatorUxChrome";
import { adHasMedia, computeDraftScore, getActiveAd, getActiveAdset } from "@/lib/campaign-draft";

function scoreBandLabel(score: number, t: ReturnType<typeof useTranslations<"campaignCreator">>) {
  if (score >= 80) return t("scoreBandGreat");
  if (score >= 55) return t("scoreBandGood");
  return t("scoreBandFair");
}

function ChecklistRow({ label, complete }: { label: string; complete: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--border-color)]/60 py-2.5 last:border-b-0">
      <span className="text-sm text-[var(--text-main)]">{label}</span>
      {complete ? (
        <CheckCircle2 size={18} strokeWidth={2.25} className="shrink-0 text-[var(--success)]" aria-hidden />
      ) : (
        <AlertTriangle size={18} strokeWidth={2.25} className="shrink-0 text-amber-500" aria-hidden />
      )}
    </div>
  );
}

function SummaryDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[var(--border-color)]/60 py-2 last:border-b-0 first:pt-0">
      <p className="text-[11px] text-[var(--text-dimmer)]">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-[var(--text-main)]">{value}</p>
    </div>
  );
}

export function CampaignCreatorUxMobileSummary() {
  const t = useTranslations("campaignCreator");
  const tAds = useTranslations("ads");
  const { payload, activeNode, addAdMode } = useCampaignDraft();
  const [open, setOpen] = useState(false);

  const score = computeDraftScore(payload);
  const scoreBand = scoreBandLabel(score, t);
  const stepPercent = computeWizardProgressPercent({ addAdMode, activeNode });
  const adset = getActiveAdset(payload);
  const ad = getActiveAd(payload);
  const notSet = t("sidebarNotSet");
  const objectiveLabel = t(`objective_${payload.objective}`);

  const clientOk = Boolean(payload.clientSlug.trim());
  const accountOk = Boolean(payload.adAccountId.trim());
  const identityOk = Boolean(payload.campaign.name.trim());
  const budgetOk = payload.campaign.dailyBudgetBRL >= 1;

  const panelId = "campaign-creator-mobile-summary-panel";

  return (
    <div className="campaign-creator-mobile-summary lg:hidden">
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-xl border campaign-creator-mobile-summary-card px-4 py-3.5 text-left"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
          <Wallet size={18} strokeWidth={2.25} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-heading text-sm font-semibold text-[var(--text-main)]">
            {t("sidebarContextCampaign")}
          </span>
          <span className="mt-0.5 block text-xs text-[var(--text-dim)]">{t("mobileSummarySubtitle")}</span>
        </span>
        <span className="inline-flex shrink-0 flex-col items-end gap-1">
          <span className="rounded-full bg-[var(--ui-accent-muted)] px-2 py-0.5 font-heading text-[11px] font-semibold text-[var(--ui-accent)]">
            {score}
          </span>
          <ChevronDown
            size={18}
            strokeWidth={2.25}
            className={`text-[var(--text-dim)] transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </span>
      </button>

      {open ? (
        <div
          id={panelId}
          className="mt-2 space-y-4 rounded-xl border campaign-creator-mobile-summary-card p-4"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-heading text-sm font-semibold text-[var(--text-main)]">{t("campaignScore")}</h4>
              <span className="rounded-full bg-[var(--ui-accent-muted)] px-2 py-0.5 font-heading text-[11px] font-semibold text-[var(--ui-accent)]">
                {t("wizardProgress", { percent: stepPercent })}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 border-[var(--ui-accent)] font-heading text-lg font-bold text-[var(--ui-accent)]">
                {score}
              </span>
              <p className="text-xs leading-relaxed text-[var(--text-dim)]">
                <span className="font-semibold text-[var(--text-main)]">{scoreBand}</span>
                {" · "}
                {t("scoreHint")}
              </p>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--creator-card-bg-inset,var(--surface-bg))]">
              <div
                className="h-full rounded-full bg-[var(--ui-accent)] transition-all"
                style={{ width: `${stepPercent}%` }}
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-[var(--text-dim)]">
              <ClipboardList size={14} aria-hidden />
              <span className="text-[11px] font-medium uppercase tracking-wide">{t("sidebarContextCampaign")}</span>
            </div>
            <SummaryDetailRow label={t("campaignSub_objective")} value={objectiveLabel} />
            <ChecklistRow label={tAds("clientLabel")} complete={clientOk} />
            <ChecklistRow label={tAds("adAccount")} complete={accountOk} />
            <ChecklistRow label={t("campaignSub_basics")} complete={identityOk} />
            <ChecklistRow label={t("campaignSub_budget")} complete={budgetOk} />
          </div>

          {activeNode === "adset" || activeNode === "ad" || activeNode === "review" ? (
            <div>
              <div className="mb-2 flex items-center gap-2 text-[var(--text-dim)]">
                <Target size={14} aria-hidden />
                <span className="text-[11px] font-medium uppercase tracking-wide">{t("sidebarContextAdset")}</span>
              </div>
              <SummaryDetailRow label={t("adsetName")} value={adset.name || notSet} />
              <SummaryDetailRow
                label={t("sidebarTargetingMode")}
                value={t(`targetingMode_${adset.targetingMode ?? "compiler"}` as "targetingMode_compiler")}
              />
            </div>
          ) : null}

          {activeNode === "ad" || activeNode === "review" ? (
            <div>
              <div className="mb-2 flex items-center gap-2 text-[var(--text-dim)]">
                <Tag size={14} aria-hidden />
                <span className="text-[11px] font-medium uppercase tracking-wide">{t("sidebarContextAd")}</span>
              </div>
              <SummaryDetailRow
                label={t("treeAd")}
                value={
                  adHasMedia(ad)
                    ? ad.format === "video"
                      ? t("videosSelected", { count: ad.videoIds.length })
                      : t("imagesSelected", { count: ad.imageHashes.length })
                    : t("noMedia")
                }
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
