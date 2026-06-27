"use client";

import { useTranslations } from "next-intl";

import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { useAdSetStepSubflowOptional } from "@/components/campaign-creator/AdSetStepSubflowContext";
import { useAdStepSubflowOptional } from "@/components/campaign-creator/AdStepSubflowContext";
import { useCampaignStepSubflowOptional } from "@/components/campaign-creator/CampaignStepSubflowContext";
import { resolveSubflowStepError } from "@/components/campaign-creator/subflow-step-validation";
import { Link } from "@/i18n/navigation";
import {
  nextNode,
  prevNode,
  validateAdSetStep,
  validateAdStep,
  validateCampaignStep,
  validatePublishDraft
} from "@/lib/campaign-draft";
import { resolveCreatorBackNav } from "@/lib/creator-wizard-nav";

export function CampaignCreatorFooter({
  onPublish,
  publishing
}: {
  onPublish?: () => void;
  publishing?: boolean;
}) {
  const t = useTranslations("campaignCreator");
  const tCommon = useTranslations("common");
  const { activeNode, setActiveNode, payload, saving, lastSavedAt, addAdMode, addAdsetMode, inheritCampaignMode } =
    useCampaignDraft();
  const campaignSubflow = useCampaignStepSubflowOptional();
  const adsetSubflow = useAdSetStepSubflowOptional();
  const adSubflow = useAdStepSubflowOptional();

  const err = addAdMode
    ? activeNode === "ad"
      ? resolveSubflowStepError(adSubflow, () => validatePublishDraft(payload))
      : null
    : addAdsetMode
      ? activeNode === "adset"
        ? resolveSubflowStepError(adsetSubflow, () => validateAdSetStep(payload))
        : activeNode === "ad"
          ? resolveSubflowStepError(adSubflow, () => validateAdStep(payload))
          : null
      : activeNode === "campaign"
        ? resolveSubflowStepError(campaignSubflow, () => validateCampaignStep(payload))
        : activeNode === "adset"
          ? resolveSubflowStepError(adsetSubflow, () => validateAdSetStep(payload))
          : activeNode === "ad"
            ? resolveSubflowStepError(adSubflow, () => validateAdStep(payload))
            : null;

  function goNext() {
    if (err) return;
    if (activeNode === "campaign" && campaignSubflow && !campaignSubflow.isLast) {
      campaignSubflow.goNext();
      return;
    }
    if (activeNode === "adset" && adsetSubflow && !adsetSubflow.isLast) {
      adsetSubflow.goNext();
      return;
    }
    if (activeNode === "ad" && adSubflow && !adSubflow.isLast) {
      adSubflow.goNext();
      return;
    }
    const n = nextNode(activeNode);
    if (n) setActiveNode(n);
  }

  function goPrev() {
    if (activeNode === "campaign" && campaignSubflow?.goPrev()) return;
    if (activeNode === "adset" && adsetSubflow?.goPrev()) return;
    if (activeNode === "ad" && adSubflow?.goPrev()) return;
    const p = prevNode(activeNode);
    if (p) setActiveNode(p);
  }

  const { showBack, backEnabled } = resolveCreatorBackNav({
    addAdMode,
    addAdsetMode,
    activeNode,
    campaignIsFirst: activeNode === "campaign" ? campaignSubflow?.isFirst : false
  });

  return (
    <footer className="flex shrink-0 items-center justify-between border-t border-[var(--border-color)] bg-[var(--surface-card)] px-4 py-3">
      <Link
        href={
          inheritCampaignMode && payload.meta?.targetMetaCampaignId
            ? addAdsetMode
              ? `/campaigns/${payload.meta.targetMetaCampaignId}/adsets${
                  payload.clientSlug ? `?client=${encodeURIComponent(payload.clientSlug)}` : ""
                }`
              : `/campaigns/${payload.meta.targetMetaCampaignId}/ads${
                  payload.clientSlug
                    ? `?client=${encodeURIComponent(payload.clientSlug)}${
                        payload.meta.targetMetaAdsetId
                          ? `&adset=${encodeURIComponent(payload.meta.targetMetaAdsetId)}`
                          : ""
                      }`
                    : ""
                }`
            : "/campaigns"
        }
        className="ui-btn-secondary text-xs"
      >
        {t("close")}
      </Link>
      <div className="flex items-center gap-3">
        {err ? (
          <span className="max-w-[220px] text-right text-[11px] text-red-600">{t(err as Parameters<typeof t>[0])}</span>
        ) : null}
        {lastSavedAt && !saving ? (
          <span className="hidden text-[11px] text-emerald-600 sm:inline">{t("allSaved")}</span>
        ) : null}
        {showBack ? (
          <button
            type="button"
            className="ui-btn-secondary text-xs disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!backEnabled}
            onClick={backEnabled ? goPrev : undefined}
          >
            {t("back")}
          </button>
        ) : null}
        {activeNode === "review" ? (
          <button
            type="button"
            className="ui-btn-primary text-xs"
            disabled={publishing}
            onClick={onPublish}
          >
            {publishing ? tCommon("sending") : addAdMode ? t("publishAd") : addAdsetMode ? t("publishAdset") : t("publish")}
          </button>
        ) : (
          <button
            type="button"
            className="ui-btn-primary text-xs disabled:opacity-50"
            disabled={!!err}
            onClick={goNext}
          >
            {t("next")}
          </button>
        )}
      </div>
    </footer>
  );
}
