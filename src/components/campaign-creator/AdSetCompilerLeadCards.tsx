"use client";

import { ChevronRight, Settings2, Users } from "lucide-react";
import { useTranslations } from "next-intl";

type Props = {
  appliedAudienceName: string | null;
  adsetName: string;
  disabled?: boolean;
  onOpenSavedAudience: () => void;
  onOpenConfiguration: () => void;
};

export function AdSetCompilerLeadCards({
  appliedAudienceName,
  adsetName,
  disabled,
  onOpenSavedAudience,
  onOpenConfiguration
}: Props) {
  const t = useTranslations("campaignCreator");
  const audienceLoaded = !!appliedAudienceName?.trim();
  const audiencePreview =
    appliedAudienceName?.trim() || t("loadSavedAudiencePreviewPlaceholder");
  const configPreview = adsetName.trim() || t("adsetNamePlaceholder");

  return (
    <div className="campaign-creator-adset-two-col campaign-creator-adset-two-col--equal-height">
      <div className="campaign-creator-copy-card campaign-creator-copy-card--lead">
        <div className="campaign-creator-copy-card__content">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
            <Users size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-heading text-sm font-semibold text-[var(--text-main)]">
              {t("loadSavedAudienceTitle")}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-dim)]">
              {t("loadSavedAudienceHint")}
            </p>
            <p
              className={`mt-1 min-h-[1.125rem] truncate text-xs font-medium ${
                audienceLoaded ? "text-[var(--ui-accent)]" : "text-[var(--text-dim)]"
              }`}
            >
              {audiencePreview}
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onOpenSavedAudience}
          className="campaign-creator-copy-card__action ui-btn-secondary inline-flex shrink-0 items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-heading font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          {audienceLoaded ? t("loadSavedAudienceEditButton") : t("loadSavedAudienceSelectButton")}
          <ChevronRight size={14} strokeWidth={2.25} />
        </button>
      </div>

      <div className="campaign-creator-copy-card campaign-creator-copy-card--lead">
        <div className="campaign-creator-copy-card__content">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
            <Settings2 size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-heading text-sm font-semibold text-[var(--text-main)]">
              {t("adsetSection_configuration_title")}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-dim)]">
              {t("adsetConfigurationHint")}
            </p>
            <p className="mt-1 min-h-[1.125rem] truncate text-xs font-medium text-[var(--text-main)]">
              {configPreview}
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onOpenConfiguration}
          className="campaign-creator-copy-card__action ui-btn-secondary inline-flex shrink-0 items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-heading font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("adsetConfigurationSelectButton")}
          <ChevronRight size={14} strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}
