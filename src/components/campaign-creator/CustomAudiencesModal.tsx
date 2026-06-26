"use client";

import { useTranslations } from "next-intl";

import { AudiencePicker } from "@/components/campaign-creator/AudiencePicker";
import { DsModal } from "@/design-system/components/DsModal";
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
    <DsModal
      open={open}
      onClose={onClose}
      title={t("metaRefineOptional")}
      width="lg"
      footer={
        <button type="button" className="ui-btn-accent px-4 py-2 text-sm font-heading font-semibold" onClick={onClose}>
          {t("close")}
        </button>
      }
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
    </DsModal>
  );
}
