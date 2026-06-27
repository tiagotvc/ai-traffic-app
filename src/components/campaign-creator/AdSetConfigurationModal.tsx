"use client";

import { useTranslations } from "next-intl";
import { Settings2 } from "lucide-react";

import { AdSetConfigurationPanel } from "@/components/campaign-creator/AdSetConfigurationPanel";
import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";
import type { AdSetDraftItem, CampaignDraftPayload } from "@/lib/campaign-draft";
import type { FormSelectOption } from "@/components/ui/FormSelect";

type Props = {
  open: boolean;
  onClose: () => void;
  payload: CampaignDraftPayload;
  adset: AdSetDraftItem;
  clientRequired: boolean;
  addAdsetMode: boolean;
  dynamicCreativeLockedByReuse: boolean;
  conversionLocationOptions: FormSelectOption[];
  pixelOptions: FormSelectOption[];
  conversionEventOptions: FormSelectOption[];
  onPatchAdset: (patch: Partial<AdSetDraftItem>) => void;
  onImport: () => void;
};

export function AdSetConfigurationModal({
  open,
  onClose,
  payload,
  adset,
  clientRequired,
  addAdsetMode,
  dynamicCreativeLockedByReuse,
  conversionLocationOptions,
  pixelOptions,
  conversionEventOptions,
  onPatchAdset,
  onImport
}: Props) {
  const t = useTranslations("campaignCreator");

  return (
    <CreatorModalShell
      open={open}
      onClose={onClose}
      title={t("adsetSection_configuration_title")}
      subtitle={t("adsetConfigurationHint")}
      titleIcon={<Settings2 size={16} />}
      width="md"
      className="max-h-[min(640px,92vh)] max-w-lg"
      onCancel={onClose}
      hideFooter
    >
      <AdSetConfigurationPanel
        layout="stacked"
        payload={payload}
        adset={adset}
        clientRequired={clientRequired}
        addAdsetMode={addAdsetMode}
        dynamicCreativeLockedByReuse={dynamicCreativeLockedByReuse}
        conversionLocationOptions={conversionLocationOptions}
        pixelOptions={pixelOptions}
        conversionEventOptions={conversionEventOptions}
        onPatchAdset={onPatchAdset}
        onImport={onImport}
      />
    </CreatorModalShell>
  );
}
