"use client";

import { useTranslations } from "next-intl";

type Props = {
  businessDescription: string;
  targetProfile: string;
  onBusinessDescriptionChange: (v: string) => void;
  onTargetProfileChange: (v: string) => void;
  disabled?: boolean;
};

export function AiAudienceBriefFields({
  businessDescription,
  targetProfile,
  onBusinessDescriptionChange,
  onTargetProfileChange,
  disabled
}: Props) {
  const t = useTranslations("campaignCreator.aiWizard");

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-[var(--text-dim)]">{t("businessDescription")}</label>
        <textarea
          value={businessDescription}
          onChange={(e) => onBusinessDescriptionChange(e.target.value)}
          rows={3}
          disabled={disabled}
          placeholder={t("businessDescriptionPlaceholder")}
          className="ui-input mt-1 w-full resize-none text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-[var(--text-dim)]">{t("targetProfile")}</label>
        <textarea
          value={targetProfile}
          onChange={(e) => onTargetProfileChange(e.target.value)}
          rows={3}
          disabled={disabled}
          placeholder={t("targetProfilePlaceholder")}
          className="ui-input mt-1 w-full resize-none text-sm"
        />
      </div>
    </div>
  );
}
