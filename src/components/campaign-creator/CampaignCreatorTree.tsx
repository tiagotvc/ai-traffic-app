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

const NODES: { id: CreatorNode; icon: string }[] = [
  { id: "campaign", icon: FOLDER_PATH },
  { id: "adset", icon: GRID_PATH },
  { id: "ad", icon: DOC_PATH }
];

export function CampaignCreatorTree() {
  const t = useTranslations("campaignCreator");
  const { payload, activeNode, setActiveNode } = useCampaignDraft();

  const labels: Record<CreatorNode, string> = {
    campaign: payload.campaign.name || t("treeCampaign"),
    adset: payload.adset.name || t("treeAdset"),
    ad: payload.ad.name || t("treeAd"),
    review: t("treeReview")
  };

  return (
    <nav className="space-y-1 p-3">
      {NODES.map(({ id, icon }) => {
        const active = activeNode === id;
        const visited = payload.visitedNodes.includes(id);
        return (
          <button
            key={id}
            type="button"
            disabled={!visited && id !== "campaign"}
            onClick={() => visited && setActiveNode(id)}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition ${
              active
                ? "bg-violet-50 font-medium text-violet-800"
                : visited
                  ? "text-slate-700 hover:bg-slate-50"
                  : "cursor-not-allowed text-slate-300"
            }`}
          >
            <OutlineIcon d={icon} className="h-4 w-4 shrink-0" />
            <span className="truncate">{labels[id]}</span>
          </button>
        );
      })}
    </nav>
  );
}
