"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { useTranslations } from "next-intl";

import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { Badge } from "@/components/ui/Badge";
import { Link } from "@/i18n/navigation";
import { PageTitleBlock } from "@/design-system/components/PageTitleBlock";

export function CampaignCreatorHeader() {
  const t = useTranslations("campaignCreator");
  const { payload, saving, lastSavedAt, addAdMode, addAdsetMode, inheritCampaignMode } = useCampaignDraft();
  const [tab, setTab] = useState<"edit" | "analyze">("edit");

  return (
    <header className="border-b border-[var(--border-color)] bg-[var(--surface-card)] px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-[var(--text-dim)]">
            {inheritCampaignMode && payload.meta?.targetMetaCampaignId ? (
              <>
                <Link
                  href={
                    addAdsetMode
                      ? `/campaigns/${payload.meta.targetMetaCampaignId}/adsets${
                          payload.clientSlug
                            ? `?client=${encodeURIComponent(payload.clientSlug)}`
                            : ""
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
                  }
                  className="ui-link"
                >
                  {payload.campaign.name || t("breadcrumbCampaigns")}
                </Link>
                {" › "}
                <span className="text-[var(--text-dim)]">
                  {addAdsetMode ? t("addAdsetTitle") : t("addAdTitle")}
                </span>
              </>
            ) : (
              <>
                <Link href="/campaigns" className="ui-link">
                  {t("breadcrumbCampaigns")}
                </Link>
                {" › "}
                <span className="text-[var(--text-dim)]">{payload.campaign.name || t("newCampaign")}</span>
              </>
            )}
          </p>
          <PageTitleBlock
            title={addAdsetMode ? t("addAdsetTitle") : addAdMode ? t("addAdTitle") : t("title")}
            titleIcon={<Megaphone size={16} aria-hidden />}
            badge={
              <>
                <Badge variant="warning">{t("draftStatus")}</Badge>
                {saving ? (
                  <span className="text-[11px] text-[var(--text-dimmer)]">{t("saving")}</span>
                ) : lastSavedAt ? (
                  <span className="text-[11px] text-[var(--text-dimmer)]">{t("saved")}</span>
                ) : null}
              </>
            }
          />
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-[var(--border-color)] p-0.5">
          <button
            type="button"
            onClick={() => setTab("edit")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              tab === "edit" ? "bg-[rgba(124,58,237,0.06)] text-[var(--violet)]" : "text-[var(--text-dim)]"
            }`}
          >
            {t("tabEdit")}
          </button>
          <button
            type="button"
            onClick={() => setTab("analyze")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              tab === "analyze" ? "bg-[rgba(124,58,237,0.06)] text-[var(--violet)]" : "text-[var(--text-dim)]"
            }`}
            title={t("tabAnalyzeHint")}
          >
            {t("tabAnalyze")}
          </button>
        </div>
      </div>
      {tab === "analyze" ? (
        <p className="mt-2 text-xs text-[var(--text-dim)]">{t("tabAnalyzeHint")}</p>
      ) : null}
    </header>
  );
}
