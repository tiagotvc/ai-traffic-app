"use client";

import { useTranslations } from "next-intl";

import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { computeDraftScore, getActiveAd, adHasMedia } from "@/lib/campaign-draft";

export function CampaignCreatorPreview() {
  const t = useTranslations("campaignCreator");
  const { payload } = useCampaignDraft();
  const score = computeDraftScore(payload);
  const ad = getActiveAd(payload);
  const title = ad.titles.find((x) => x.trim()) ?? t("previewTitlePlaceholder");
  const body = ad.bodies.find((x) => x.trim()) ?? "";
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;

  return (
    <aside className="space-y-4 p-4">
      <div className="ui-card p-4">
        <h2 className="text-sm font-semibold text-slate-900">{t("campaignScore")}</h2>
        <div className="mt-3 flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0">
            <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="36" fill="none" stroke="#e2e8f0" strokeWidth="6" />
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="#7c3aed"
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-violet-700">
              {score}
            </span>
          </div>
          <p className="text-xs text-slate-500">{t("scoreHint")}</p>
        </div>
      </div>

      <div className="ui-card p-4">
        <h2 className="text-sm font-semibold text-slate-900">{t("adPreview")}</h2>
        <p className="mt-1 text-[11px] text-slate-500">{t("adPreviewHint")}</p>
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-slate-100 p-8 text-center text-xs text-slate-400">
            {adHasMedia(ad)
              ? ad.format === "video"
                ? t("videosSelected", { count: ad.videoIds.length })
                : t("imagesSelected", { count: ad.imageHashes.length })
              : t("noMedia")}
          </div>
          <div className="space-y-1 p-3">
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            {body ? <p className="text-xs text-slate-600">{body}</p> : null}
            {ad.callToAction ? (
              <p className="text-[11px] text-slate-500">CTA: {ad.callToAction}</p>
            ) : null}
            {ad.whatsappWelcomeMessage ? (
              <p className="text-[11px] text-slate-500">{ad.whatsappWelcomeMessage}</p>
            ) : null}
            {ad.linkUrl ? (
              <p className="truncate text-[11px] text-violet-600">{ad.linkUrl}</p>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}
