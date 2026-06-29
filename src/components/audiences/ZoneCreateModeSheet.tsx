"use client";

import { useEffect, useState } from "react";
import { MapPin, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  CreationModeChoiceCard,
  CreationModeChoiceGrid,
  creationModeModalMaxWidthClass
} from "@/components/campaign-creator/CreationModeChoiceCard";
import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";

type CreationMode = "manual" | "ai";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelectManual: () => void;
  onSelectAi: () => void;
};

export function ZoneCreateModeSheet({
  open,
  onClose,
  onSelectManual,
  onSelectAi
}: Props) {
  const t = useTranslations("audiences");
  const tc = useTranslations("campaignCreator");
  const tAi = useTranslations("campaignCreator.ai");
  const [selected, setSelected] = useState<CreationMode | null>(null);

  useEffect(() => {
    if (!open) setSelected(null);
  }, [open]);

  function handleContinue() {
    if (!selected) return;
    onClose();
    if (selected === "manual") onSelectManual();
    else onSelectAi();
  }

  return (
    <CreatorModalShell
      open={open}
      onClose={onClose}
      title={t("zoneCreateModeTitle")}
      subtitle={t("zoneCreateModeSubtitle")}
      width="md"
      className={creationModeModalMaxWidthClass(2)}
      contentClassName="pb-8"
      onCancel={onClose}
      cancelLabel={tc("modalCancel")}
      onPrimary={handleContinue}
      primaryLabel={tAi("modePickerStart")}
      primaryDisabled={selected === null}
      showPrimaryCheck={false}
    >
      <CreationModeChoiceGrid ariaLabel={t("zoneCreateModeTitle")}>
        <CreationModeChoiceCard
          selected={selected === "manual"}
          label={t("zoneCreateManual")}
          description={t("zoneCreateManualHint")}
          icon={MapPin}
          onSelect={() => setSelected("manual")}
        />
        <CreationModeChoiceCard
          selected={selected === "ai"}
          label={t("zoneCreateAi")}
          description={t("zoneCreateAiHint")}
          icon={Sparkles}
          onSelect={() => setSelected("ai")}
          aiCredits={{ kind: "audience_suggestions", calls: 1 }}
        />
      </CreationModeChoiceGrid>
    </CreatorModalShell>
  );
}
