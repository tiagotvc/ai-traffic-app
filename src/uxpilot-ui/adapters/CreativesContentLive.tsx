"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Filter, SlidersHorizontal, Trophy } from "lucide-react";

import { CreativeCompareModal } from "@/components/creatives/CreativeCompareModal";
import { CreativePreviewModal } from "@/components/creatives/CreativePreviewModal";
import { RankingConfigModal } from "@/components/creatives/RankingConfigModal";
import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { DsAccentOutlineButton } from "@/design-system";
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
  const [activeFilterTab, setActiveFilterTab] = useState("Todos");
  const [previewing, setPreviewing] = useState<CreativeItem | null>(null);
  const [comparing, setComparing] = useState<CreativeItem | null>(null);

  useCommandStripPage({ hideFilters: true, hideSync: true });

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

  function handlePreview(card: UxCreativeCard) {
    setPreviewing(card.raw);
  }

  function handleCompare(card: UxCreativeCard) {
    setComparing(card.raw);
  }

  return (
    <>
      <PageToolbar
        filterCreatorFields
        icon={<Trophy size={16} />}
        title={t("rankingTitle")}
        subtitle={t("rankingSubtitle")}
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: t("searchPlaceholder")
        }}
        pageFilters={
          <FilterSelectDropdown
            creatorField
            icon={<Filter size={14} />}
            label=""
            placeholder={t("campaignTypeFilter")}
            options={filterTabs.map((tab) => ({ value: tab, label: tab }))}
            value={activeFilterTab}
            onChange={setActiveFilterTab}
            className="w-full max-w-none sm:w-auto"
          />
        }
        actions={
          <DsAccentOutlineButton type="button" onClick={() => data.setConfigOpen(true)}>
            <SlidersHorizontal size={14} />
            {t("cfgButton")}
          </DsAccentOutlineButton>
        }
      />

      <CreativesContent
        live={{
          creatives,
          filterTabs,
          loading: data.loading || data.clientsLoading,
          searchQuery,
          activeFilterTab,
          onOpenCriteria: () => data.setConfigOpen(true),
          onPreview: (creative) => handlePreview(creative as UxCreativeCard),
          onCompare: (creative) => handleCompare(creative as UxCreativeCard),
          hideChrome: true
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
