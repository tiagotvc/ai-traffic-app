"use client";

import { useEffect, useState } from "react";
import { Copy, PenLine, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  CreationModeChoiceCard,
  CreationModeChoiceGrid,
  creationModeModalMaxWidthClass
} from "@/components/campaign-creator/CreationModeChoiceCard";
import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";

type CreationMode = "manual" | "ai" | "existing";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelectManual: () => void;
  onSelectAi: () => void;
  onSelectExisting: () => void;
};

export function PersonaCreateModeSheet({
  open,
  onClose,
  onSelectManual,
  onSelectAi,
  onSelectExisting
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
    if (selected === "existing") onSelectExisting();
    else if (selected === "manual") onSelectManual();
    else onSelectAi();
  }

  return (
    <CreatorModalShell
      open={open}
      onClose={onClose}
      title={t("personaCreateModeTitle")}
      subtitle={t("personaCreateModeSubtitle")}
      width="md"
      className={creationModeModalMaxWidthClass(3)}
      contentClassName="pb-8"
      onCancel={onClose}
      cancelLabel={tc("modalCancel")}
      onPrimary={handleContinue}
      primaryLabel={tAi("modePickerStart")}
      primaryDisabled={selected === null}
      showPrimaryCheck={false}
    >
      <CreationModeChoiceGrid ariaLabel={t("personaCreateModeTitle")}>
        <CreationModeChoiceCard
          selected={selected === "manual"}
          label={t("personaCreateFromScratch")}
          description={t("personaCreateFromScratchHint")}
          icon={PenLine}
          onSelect={() => setSelected("manual")}
        />
        <CreationModeChoiceCard
          selected={selected === "ai"}
          label={t("personaCreateAi")}
          description={t("personaCreateAiHint")}
          icon={Sparkles}
          onSelect={() => setSelected("ai")}
          aiCredits={{ kind: "audience_suggestions", calls: 1 }}
        />
        <CreationModeChoiceCard
          selected={selected === "existing"}
          label={t("personaCreateExisting")}
          description={t("personaCreateExistingHint")}
          icon={Copy}
          onSelect={() => setSelected("existing")}
        />
      </CreationModeChoiceGrid>
    </CreatorModalShell>
  );
}
