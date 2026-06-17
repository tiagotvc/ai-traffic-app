"use client";

import { useTranslations } from "next-intl";

import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { Link } from "@/i18n/navigation";
import {
  nextNode,
  prevNode,
  validateAdSetStep,
  validateAdStep,
  validateCampaignStep,
  validatePublishDraft
} from "@/lib/campaign-draft";

export function CampaignCreatorFooter({
  onPublish,
  publishing
}: {
  onPublish?: () => void;
  publishing?: boolean;
}) {
  const t = useTranslations("campaignCreator");
  const tCommon = useTranslations("common");
  const { activeNode, setActiveNode, payload, saving, lastSavedAt, addAdMode } = useCampaignDraft();

  const err = addAdMode
    ? activeNode === "ad"
      ? validatePublishDraft(payload)
      : null
    : activeNode === "campaign"
      ? validateCampaignStep(payload)
      : activeNode === "adset"
        ? validateAdSetStep(payload)
        : activeNode === "ad"
          ? validateAdStep(payload)
          : null;

  function goNext() {
    const n = nextNode(activeNode);
    if (n) setActiveNode(n);
  }

  function goPrev() {
    const p = prevNode(activeNode);
    if (p) setActiveNode(p);
  }

  return (
    <footer className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-white px-4 py-3">
      <Link
        href={
          addAdMode && payload.meta?.targetMetaCampaignId
            ? `/campaigns/${payload.meta.targetMetaCampaignId}/ads${
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
        {lastSavedAt && !saving ? (
          <span className="hidden text-[11px] text-emerald-600 sm:inline">{t("allSaved")}</span>
        ) : null}
        {activeNode !== "campaign" && !(addAdMode && activeNode === "ad") ? (
          <button type="button" className="ui-btn-secondary text-xs" onClick={goPrev}>
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
            {publishing ? tCommon("sending") : addAdMode ? t("publishAd") : t("publish")}
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
