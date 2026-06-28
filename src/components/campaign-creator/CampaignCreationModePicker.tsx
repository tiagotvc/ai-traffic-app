"use client";

import { useEffect, useState } from "react";
import { PenLine, Sparkles, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { ChoiceCardCheck } from "@/components/campaign-creator/BudgetChoiceCard";
import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";
import { useRouter } from "@/i18n/navigation";
import { usePlatformFeature } from "@/hooks/usePlatformFeature";
import { cn } from "@/lib/cn";

type CreationMode = "manual" | "ai";

type Props = {
  open: boolean;
  onClose: () => void;
  clientSlug?: string;
};

function buildHref(mode: CreationMode, clientSlug?: string) {
  const params = new URLSearchParams();
  if (clientSlug) params.set("client", clientSlug);
  params.set("mode", mode);
  const qs = params.toString();
  return `/campaigns/new${qs ? `?${qs}` : ""}`;
}

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

export function CampaignCreationModePicker({ open, onClose, clientSlug }: Props) {
  const t = useTranslations("campaignCreator.ai");
  const tc = useTranslations("campaignCreator");
  const router = useRouter();
  const aiGenerateEnabled = usePlatformFeature("campaigns.ai-generate");
  const [selected, setSelected] = useState<CreationMode | null>(null);

  useEffect(() => {
    if (!open) setSelected(null);
  }, [open]);

  function handleCreate() {
    if (!selected) return;
    router.push(buildHref(selected, clientSlug));
    onClose();
  }

  return (
    <CreatorModalShell
      open={open}
      onClose={onClose}
      title={t("modePickerTitle")}
      subtitle={t("modePickerHint")}
      width="md"
      className="max-w-xl"
      contentClassName="pb-8"
      onCancel={onClose}
      cancelLabel={tc("modalCancel")}
      onPrimary={handleCreate}
      primaryLabel={t("modePickerStart")}
      primaryDisabled={selected === null}
      showPrimaryCheck={false}
    >
      <div
        className={cn(
          "grid items-stretch gap-4",
          aiGenerateEnabled ? "sm:grid-cols-2" : "grid-cols-1"
        )}
        role="radiogroup"
        aria-label={t("modePickerTitle")}
      >
        <ModeChoiceCard
          selected={selected === "manual"}
          label={t("modeManualTitle")}
          description={t("modeManualHint")}
          icon={PenLine}
          onSelect={() => setSelected("manual")}
        />
        {aiGenerateEnabled ? (
          <ModeChoiceCard
            selected={selected === "ai"}
            label={t("modeAiTitle")}
            description={t("modeAiHint")}
            icon={Sparkles}
            onSelect={() => setSelected("ai")}
          />
        ) : null}
      </div>
    </CreatorModalShell>
  );
}
