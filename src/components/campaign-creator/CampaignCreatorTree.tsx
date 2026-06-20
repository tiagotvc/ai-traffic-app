"use client";

import { useTranslations } from "next-intl";

import { OutlineIcon } from "@/components/ui/OutlineIcon";
import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import type { CreatorNode } from "@/lib/campaign-draft";

const FOLDER_PATH =
  "M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z";
const GRID_PATH =
  "M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z";
const DOC_PATH =
  "M9 12h6m-6 4h6M9 8h6M7 4h7l3 3v13a1 1 0 01-1 1H7a1 1 0 01-1-1V5a1 1 0 011-1z";

export function CampaignCreatorTree() {
  const t = useTranslations("campaignCreator");
  const { payload, activeNode, setActiveNode, updatePayload, addAdMode } = useCampaignDraft();

  const campaignLabel = payload.campaign.name || t("treeCampaign");

  function goAdset(adsetId: string) {
    updatePayload({ activeAdsetId: adsetId });
    setActiveNode("adset");
  }

  function goAd(adId: string) {
    updatePayload({ activeAdId: adId });
    setActiveNode("ad");
  }

  const visited = (n: CreatorNode) => payload.visitedNodes.includes(n);

  return (
    <nav className="space-y-1 p-3">
      {!addAdMode ? (
        <button
          type="button"
          onClick={() => setActiveNode("campaign")}
          className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition ${
            activeNode === "campaign"
              ? "bg-[rgba(124,58,237,0.06)] font-medium text-[var(--violet)]"
              : "text-[var(--text-dim)] hover:bg-[var(--surface-bg)]"
          }`}
        >
          <OutlineIcon d={FOLDER_PATH} className="h-4 w-4 shrink-0" />
          <span className="truncate">{campaignLabel}</span>
        </button>
      ) : (
        <p className="px-3 py-2 text-xs font-medium text-[var(--text-dim)]">{payload.meta?.targetAdsetName}</p>
      )}

      {!addAdMode ? (
        <div className="ml-2 space-y-0.5 border-l border-[var(--border-color)] pl-2">
          <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-[var(--text-dimmer)]">
            {t("treeAdset")}
          </p>
          {payload.adsets.map((adset) => (
            <button
              key={adset.id}
              type="button"
              disabled={!visited("adset")}
              onClick={() => goAdset(adset.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition ${
                activeNode === "adset" && payload.activeAdsetId === adset.id
                  ? "bg-[rgba(124,58,237,0.06)] font-medium text-[var(--violet)]"
                  : visited("adset")
                    ? "text-[var(--text-dim)] hover:bg-[var(--surface-bg)]"
                    : "cursor-not-allowed text-[var(--text-dimmer)]"
              }`}
            >
              <OutlineIcon d={GRID_PATH} className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{adset.name || t("treeAdset")}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="ml-2 space-y-0.5 border-l border-[var(--border-color)] pl-2">
        <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-[var(--text-dimmer)]">
          {t("treeAd")}
        </p>
        {payload.ads.map((adItem) => (
          <button
            key={adItem.id}
            type="button"
            disabled={!visited("ad")}
            onClick={() => goAd(adItem.id)}
            className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition ${
              activeNode === "ad" && payload.activeAdId === adItem.id
                ? "bg-[rgba(124,58,237,0.06)] font-medium text-[var(--violet)]"
                : visited("ad")
                  ? "text-[var(--text-dim)] hover:bg-[var(--surface-bg)]"
                  : "cursor-not-allowed text-[var(--text-dimmer)]"
            }`}
          >
            <OutlineIcon d={DOC_PATH} className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{adItem.name || t("treeAd")}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={!visited("review")}
        onClick={() => visited("review") && setActiveNode("review")}
        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition ${
          activeNode === "review"
            ? "bg-[rgba(124,58,237,0.06)] font-medium text-[var(--violet)]"
            : visited("review")
              ? "text-[var(--text-dim)] hover:bg-[var(--surface-bg)]"
              : "cursor-not-allowed text-[var(--text-dimmer)]"
        }`}
      >
        <span className="text-base">✓</span>
        <span className="truncate">{t("treeReview")}</span>
      </button>
    </nav>
  );
}
