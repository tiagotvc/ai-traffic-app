"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { Badge } from "@/components/ui/Badge";
import { Link } from "@/i18n/navigation";

export function CampaignCreatorHeader() {
  const t = useTranslations("campaignCreator");
  const { payload, saving, lastSavedAt, addAdMode } = useCampaignDraft();
  const [tab, setTab] = useState<"edit" | "analyze">("edit");

  return (
    <header className="border-b border-slate-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-500">
            {addAdMode && payload.meta?.targetMetaCampaignId ? (
              <>
                <Link
                  href={`/campaigns/${payload.meta.targetMetaCampaignId}/ads${
                    payload.clientSlug
                      ? `?client=${encodeURIComponent(payload.clientSlug)}${
                          payload.meta.targetMetaAdsetId
                            ? `&adset=${encodeURIComponent(payload.meta.targetMetaAdsetId)}`
                            : ""
                        }`
                      : ""
                  }`}
                  className="hover:text-violet-600"
                >
                  {payload.campaign.name || t("breadcrumbCampaigns")}
                </Link>
                {" › "}
                <span className="text-slate-700">{t("addAdTitle")}</span>
              </>
            ) : (
              <>
                <Link href="/campaigns" className="hover:text-violet-600">
                  {t("breadcrumbCampaigns")}
                </Link>
                {" › "}
                <span className="text-slate-700">{payload.campaign.name || t("newCampaign")}</span>
              </>
            )}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-900">
              {addAdMode ? t("addAdTitle") : t("title")}
            </h1>
            <Badge variant="warning">{t("draftStatus")}</Badge>
            {saving ? (
              <span className="text-[11px] text-slate-400">{t("saving")}</span>
            ) : lastSavedAt ? (
              <span className="text-[11px] text-slate-400">{t("saved")}</span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 p-0.5">
          <button
            type="button"
            onClick={() => setTab("edit")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              tab === "edit" ? "bg-violet-50 text-violet-700" : "text-slate-500"
            }`}
          >
            {t("tabEdit")}
          </button>
          <button
            type="button"
            onClick={() => setTab("analyze")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              tab === "analyze" ? "bg-violet-50 text-violet-700" : "text-slate-500"
            }`}
            title={t("tabAnalyzeHint")}
          >
            {t("tabAnalyze")}
          </button>
        </div>
      </div>
      {tab === "analyze" ? (
        <p className="mt-2 text-xs text-slate-500">{t("tabAnalyzeHint")}</p>
      ) : null}
    </header>
  );
}
