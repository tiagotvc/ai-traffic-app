"use client";

import { useEffect, useState } from "react";
import { MapPin, Sparkles, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { ChoiceCardCheck } from "@/components/campaign-creator/BudgetChoiceCard";
import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";
import { cn } from "@/lib/cn";

type CreationMode = "manual" | "ai";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelectManual: () => void;
  onSelectAi: () => void;
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
        className="grid items-stretch gap-4 sm:grid-cols-2"
        role="radiogroup"
        aria-label={t("zoneCreateModeTitle")}
      >
        <ModeChoiceCard
          selected={selected === "manual"}
          label={t("zoneCreateManual")}
          description={t("zoneCreateManualHint")}
          icon={MapPin}
          onSelect={() => setSelected("manual")}
        />
        <ModeChoiceCard
          selected={selected === "ai"}
          label={t("zoneCreateAi")}
          description={t("zoneCreateAiHint")}
          icon={Sparkles}
          onSelect={() => setSelected("ai")}
        />
      </div>
    </CreatorModalShell>
  );
}
