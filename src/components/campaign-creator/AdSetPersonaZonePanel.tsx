"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { PersonaPicker } from "@/components/campaign-creator/PersonaPicker";
import { ZonePicker } from "@/components/campaign-creator/ZonePicker";

type Props = {
  personaId: string | null | undefined;
  zoneId: string | null | undefined;
  clientSlug: string;
  adAccountId: string;
  disabled?: boolean;
  customAudienceCount: number;
  onPersonaChange: (personaId: string | null) => void;
  onZoneChange: (zoneId: string | null) => void;
  onRefineAudience: () => void;
};

export function AdSetPersonaZonePanel({
  personaId,
  zoneId,
  clientSlug,
  adAccountId,
  disabled,
  customAudienceCount,
  onPersonaChange,
  onZoneChange,
  onRefineAudience
}: Props) {
  const t = useTranslations("campaignCreator");

  return (
    <div className="space-y-3">
      <div className="campaign-creator-adset-two-col campaign-creator-adset-two-col--compact">
        <div className="campaign-creator-card campaign-creator-card--compact">
          <h4 className="campaign-creator-budget-header__title">{t("selectPersona")}</h4>
          <div className="mt-2">
            <PersonaPicker
              variant="adset"
              hideTitle
              value={personaId}
              clientSlug={clientSlug}
              adAccountId={adAccountId}
              disabled={disabled}
              onChange={onPersonaChange}
            />
          </div>
        </div>

        <div className="campaign-creator-card campaign-creator-card--compact">
          <h4 className="campaign-creator-budget-header__title">{t("selectZone")}</h4>
          <div className="mt-2">
            <ZonePicker
              variant="adset"
              hideTitle
              value={zoneId}
              disabled={disabled}
              onChange={onZoneChange}
            />
          </div>
        </div>
      </div>

      <div className="campaign-creator-adset-refine-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-main)]">{t("refineAudienceTitle")}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-dim)]">
              {t("refineAudienceSubtitle")}
            </p>
            {customAudienceCount > 0 ? (
              <p className="mt-1 text-[10px] text-[var(--text-dimmer)]">
                {t("customAudiencesIncludedLegend", { count: customAudienceCount })}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={onRefineAudience}
            className="ui-btn-accent-outline inline-flex shrink-0 items-center justify-center gap-1.5 self-start px-3 py-2 text-xs font-semibold sm:self-center"
          >
            {t("refineAudienceButton")}
            {customAudienceCount > 0 ? (
              <span className="rounded-full bg-[var(--ui-accent-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--ui-accent)]">
                {customAudienceCount}
              </span>
            ) : null}
            <ChevronRight size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
