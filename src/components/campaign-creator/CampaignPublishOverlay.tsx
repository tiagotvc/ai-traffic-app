"use client";

import { useTranslations } from "next-intl";

import { OrionActionLoadingOverlay } from "@/components/ui/OrionActionLoadingOverlay";
import type { CampaignPublishProgressStep } from "@/lib/campaign-publish-progress";

type Props = {
  open: boolean;
  step: CampaignPublishProgressStep | null;
};

export function CampaignPublishOverlay({ open, step }: Props) {
  const t = useTranslations("campaignCreator.publishOverlay");
  const displayStep = step ?? "preparing";

  return (
    <OrionActionLoadingOverlay
      open={open}
      title={t("title")}
      message={t(displayStep)}
      subtitle={t("subtitle")}
      messageKey={displayStep}
      ariaLabelledBy="campaign-publish-overlay-title"
    />
  );
}
