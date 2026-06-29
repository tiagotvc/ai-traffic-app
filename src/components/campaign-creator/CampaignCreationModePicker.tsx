"use client";

import { useEffect, useState } from "react";
import { PenLine, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  CreationModeChoiceCard,
  CreationModeChoiceGrid,
  creationModeModalMaxWidthClass
} from "@/components/campaign-creator/CreationModeChoiceCard";
import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";
import { useRouter } from "@/i18n/navigation";
import { usePlatformFeature } from "@/hooks/usePlatformFeature";
import { triggerNavigationLoading } from "@/components/ui/NavigationLoadingOverlay";
import { commitCreationMode } from "@/lib/campaign-creator/creation-flow-session";
import { cn } from "@/lib/cn";

type CreationMode = "manual" | "ai";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called when the user confirms a mode (before navigation). Use to close overlay hosts. */
  onStarted?: () => void;
  clientSlug?: string;
};

function buildHref(mode: CreationMode, clientSlug?: string) {
  const params = new URLSearchParams();
  if (clientSlug) params.set("client", clientSlug);
  params.set("mode", mode);
  const qs = params.toString();
  return `/campaigns/new${qs ? `?${qs}` : ""}`;
}

export function CampaignCreationModePicker({ open, onClose, onStarted, clientSlug }: Props) {
  const t = useTranslations("campaignCreator.ai");
  const tc = useTranslations("campaignCreator");
  const router = useRouter();
  const aiGenerateEnabled = usePlatformFeature("campaigns.ai-generate");
  const [selected, setSelected] = useState<CreationMode | null>(null);
  const optionCount = aiGenerateEnabled ? 2 : 1;

  useEffect(() => {
    if (!open) setSelected(null);
  }, [open]);

  function handleCreate() {
    if (!selected) return;
    const href = buildHref(selected, clientSlug);
    commitCreationMode(selected);
    onStarted?.();
    triggerNavigationLoading(href);
    router.push(href);
  }

  return (
    <CreatorModalShell
      open={open}
      onClose={onClose}
      title={t("modePickerTitle")}
      subtitle={t("modePickerHint")}
      width="md"
      className={creationModeModalMaxWidthClass(optionCount)}
      contentClassName="pb-8"
      onCancel={onClose}
      cancelLabel={tc("modalCancel")}
      onPrimary={handleCreate}
      primaryLabel={t("modePickerStart")}
      primaryDisabled={selected === null}
      showPrimaryCheck={false}
    >
      <CreationModeChoiceGrid ariaLabel={t("modePickerTitle")} className={cn(!aiGenerateEnabled && "max-w-sm")}>
        <CreationModeChoiceCard
          selected={selected === "manual"}
          label={t("modeManualTitle")}
          description={t("modeManualHint")}
          icon={PenLine}
          onSelect={() => setSelected("manual")}
        />
        {aiGenerateEnabled ? (
          <CreationModeChoiceCard
            selected={selected === "ai"}
            label={t("modeAiTitle")}
            description={t("modeAiHint")}
            icon={Sparkles}
            onSelect={() => setSelected("ai")}
            aiCredits={{ kind: "campaign_generate", calls: 1 }}
          />
        ) : null}
      </CreationModeChoiceGrid>
    </CreatorModalShell>
  );
}
