"use client";

import { useEffect, useState } from "react";
import { Copy, PenLine, Sparkles, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { ChoiceCardCheck } from "@/components/campaign-creator/BudgetChoiceCard";
import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";
import { cn } from "@/lib/cn";

type CreationMode = "manual" | "ai" | "existing";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelectManual: () => void;
  onSelectAi: () => void;
  onSelectExisting: () => void;
};

function ModeChoiceCard({
  selected,
  label,
  description,
  icon: Icon,
  onSelect
}: {
  selected: boolean;
  label: string;
  description: string;
  icon: LucideIcon;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "campaign-creator-budget-choice-card campaign-creator-budget-choice-card--row h-full min-h-[9.5rem]",
        selected
          ? "campaign-creator-budget-choice-card--selected"
          : "campaign-creator-budget-choice-card--unselected"
      )}
    >
      <ChoiceCardCheck selected={selected} />
      <span
        className={cn(
          "campaign-creator-budget-choice-card__icon campaign-creator-budget-choice-card__icon--inline",
          selected
            ? "campaign-creator-budget-choice-card__icon--selected"
            : "campaign-creator-budget-choice-card__icon--unselected"
        )}
        aria-hidden
      >
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <span className="campaign-creator-budget-choice-card__content">
        <span className="campaign-creator-budget-choice-card__label campaign-creator-budget-choice-card__label--inline">
          {label}
        </span>
        <span className="campaign-creator-budget-choice-card__description">{description}</span>
      </span>
    </button>
  );
}

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
      className="max-w-3xl"
      contentClassName="pb-8"
      onCancel={onClose}
      cancelLabel={tc("modalCancel")}
      onPrimary={handleContinue}
      primaryLabel={tAi("modePickerStart")}
      primaryDisabled={selected === null}
      showPrimaryCheck={false}
    >
      <div
        className="grid items-stretch gap-4 sm:grid-cols-3"
        role="radiogroup"
        aria-label={t("personaCreateModeTitle")}
      >
        <ModeChoiceCard
          selected={selected === "manual"}
          label={t("personaCreateFromScratch")}
          description={t("personaCreateFromScratchHint")}
          icon={PenLine}
          onSelect={() => setSelected("manual")}
        />
        <ModeChoiceCard
          selected={selected === "ai"}
          label={t("personaCreateAi")}
          description={t("personaCreateAiHint")}
          icon={Sparkles}
          onSelect={() => setSelected("ai")}
        />
        <ModeChoiceCard
          selected={selected === "existing"}
          label={t("personaCreateExisting")}
          description={t("personaCreateExistingHint")}
          icon={Copy}
          onSelect={() => setSelected("existing")}
        />
      </div>
    </CreatorModalShell>
  );
}
