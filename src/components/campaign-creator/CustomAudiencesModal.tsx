"use client";

import { Filter } from "lucide-react";
import { useTranslations } from "next-intl";

import { AudiencePicker } from "@/components/campaign-creator/AudiencePicker";
import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";
import type { PublishAudience } from "@/hooks/usePublishAssets";

type Props = {
  open: boolean;
  onClose: () => void;
  audiences: PublishAudience[];
  loading?: boolean;
  adAccountId?: string;
  includeIds: string[];
  excludeIds: string[];
  onChangeInclude: (ids: string[]) => void;
  onChangeExclude: (ids: string[]) => void;
  disabled?: boolean;
};

export function CustomAudiencesModal({
  open,
  onClose,
  audiences,
  loading,
  adAccountId,
  includeIds,
  excludeIds,
  onChangeInclude,
  onChangeExclude,
  disabled
}: Props) {
  const t = useTranslations("campaignCreator");

  return (
    <CreatorModalShell
      open={open}
      onClose={onClose}
      title={t("metaRefineOptional")}
      subtitle={t("refineAudienceSubtitle")}
      titleIcon={<Filter size={16} />}
      width="lg"
      onCancel={onClose}
      onPrimary={onClose}
      primaryLabel={t("close")}
      showPrimaryCheck={false}
    >
      <AudiencePicker
        audiences={audiences}
        loading={loading}
        adAccountId={adAccountId}
        includeIds={includeIds}
        excludeIds={excludeIds}
        onChangeInclude={onChangeInclude}
        onChangeExclude={onChangeExclude}
        disabled={disabled}
        embedded
      />
    </CreatorModalShell>
  );
}
