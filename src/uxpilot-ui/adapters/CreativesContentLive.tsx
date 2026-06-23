"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { CreativeCompareModal } from "@/components/creatives/CreativeCompareModal";
import { CreativePreviewModal } from "@/components/creatives/CreativePreviewModal";
import { RankingConfigModal } from "@/components/creatives/RankingConfigModal";
import { IconLabelButton } from "@/components/ui/IconLabelButton";
import { useCommandStripPage } from "@/components/layout/useCommandStripPage";
import type { CreativeItem } from "@/components/creatives/CreativeCardGrid";
import {
  flattenRankingGroups,
  presetTabsFromGroups,
  type UxCreativeCard,
} from "@/uxpilot-ui/adapters/creatives-mappers";
import { useCreativesData } from "@/uxpilot-ui/adapters/useCreativesData";
import CreativesContent from "@/uxpilot-ui/pages/content/Creatives";

export function CreativesContentLive() {
  const t = useTranslations("creativesPerf");
  const tPresets = useTranslations("campaignPresets");
  const locale = useLocale();
  const data = useCreativesData();
  const [searchQuery, setSearchQuery] = useState("");
  const [previewing, setPreviewing] = useState<CreativeItem | null>(null);
  const [comparing, setComparing] = useState<CreativeItem | null>(null);

  const presetLabel = (preset: string) => {
    if (preset.startsWith("custom:")) return preset.slice("custom:".length);
    try {
      return tPresets(preset as "default");
    } catch {
      return preset;
    }
  };

  const creatives = useMemo(
    () => flattenRankingGroups(data.groups, locale, presetLabel),
    [data.groups, locale, tPresets]
  );

  const filterTabs = useMemo(() => presetTabsFromGroups(data.groups, presetLabel), [data.groups, tPresets]);

  useCommandStripPage({});

  const configureRankingSlot = useMemo(
    () => (
      <IconLabelButton
        type="button"
        label={t("cfgButton")}
        icon={<SlidersHorizontal size={16} />}
        onClick={() => data.setConfigOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-lg font-heading text-sm font-semibold shadow-lg transition-all hover:brightness-110 active:scale-95 sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-2"
        style={{ background: "linear-gradient(135deg, #f5a623, #e8920d)", color: "#0f1419" }}
      />
    ),
    [t, data.setConfigOpen]
  );

  function handlePreview(card: UxCreativeCard) {
    setPreviewing(card.raw);
  }

  function handleCompare(card: UxCreativeCard) {
    setComparing(card.raw);
  }

  return (
    <>
      <CreativesContent
        live={{
          creatives,
          filterTabs,
          loading: data.loading || data.clientsLoading,
          searchQuery,
          onSearchChange: setSearchQuery,
          onOpenCriteria: () => data.setConfigOpen(true),
          headerActions: configureRankingSlot,
          onPreview: (creative) => handlePreview(creative as UxCreativeCard),
          onCompare: (creative) => handleCompare(creative as UxCreativeCard)
        }}
      />

      {previewing ? (
        <CreativePreviewModal
          adId={previewing.adId}
          adIds={previewing.adIds}
          imageUrl={previewing.imageUrl ?? previewing.thumbnailUrl}
          name={previewing.name}
          type={previewing.type}
          status={previewing.status}
          metrics={previewing.metrics}
          campaignsUsed={previewing.campaigns?.length ?? previewing.adsCount ?? 0}
          onClose={() => setPreviewing(null)}
        />
      ) : null}

      {comparing ? (
        <CreativeCompareModal creative={comparing} onClose={() => setComparing(null)} />
      ) : null}

      {data.configOpen ? (
        <RankingConfigModal onClose={() => data.setConfigOpen(false)} onSaved={data.onConfigSaved} />
      ) : null}
    </>
  );
}
