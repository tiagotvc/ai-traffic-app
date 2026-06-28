"use client";

import { useTranslations } from "next-intl";

import { OrionActionLoadingOverlay } from "@/components/ui/OrionActionLoadingOverlay";
import type { AiCampaignGenerationStep } from "@/lib/ai-campaign-generation-progress";

type Props = {
  open: boolean;
  step: AiCampaignGenerationStep | null;
};

export function AiCampaignGenerationOverlay({ open, step }: Props) {
  const t = useTranslations("campaignCreator.aiWizard.overlay");
  const displayStep = step ?? "understandingAudience";

  return (
    <OrionActionLoadingOverlay
      open={open}
      title={t("title")}
      message={t(displayStep)}
      subtitle={t("subtitle")}
      messageKey={displayStep}
      ariaLabelledBy="ai-generation-overlay-title"
    />
  );
}
