"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { useTranslations } from "next-intl";

import { SavedTargetingPicker } from "@/components/campaign-creator/SavedTargetingPicker";
import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";
import type { DraftTargeting } from "@/lib/campaign-draft";

type Props = {
  open: boolean;
  onClose: () => void;
  clientSlug: string;
  adAccountId: string;
  disabled?: boolean;
  selectedId?: string | null;
  onApply: (targeting: DraftTargeting, audienceName: string, audienceId?: string) => void;
};

export function SavedAudienceModal({
  open,
  onClose,
  clientSlug,
  adAccountId,
  disabled,
  selectedId,
  onApply
}: Props) {
  const t = useTranslations("campaignCreator");
  const [applying, setApplying] = useState(false);

  function handleApply(targeting: DraftTargeting, audienceName: string, audienceId?: string) {
    setApplying(true);
    try {
      onApply(targeting, audienceName, audienceId);
      onClose();
    } finally {
      setApplying(false);
    }
  }

  return (
    <CreatorModalShell
      open={open}
      onClose={onClose}
      title={t("loadSavedAudienceTitle")}
      subtitle={t("loadSavedAudienceHint")}
      titleIcon={<Users size={16} />}
      width="md"
      className="max-h-[min(560px,92vh)] max-w-lg"
      hideFooter
    >
      <SavedTargetingPicker
        clientSlug={clientSlug}
        adAccountId={adAccountId}
        disabled={disabled || applying}
        hideHeader
        modalMode
        selectedId={selectedId}
        applying={applying}
        onApply={handleApply}
      />
    </CreatorModalShell>
  );
}
