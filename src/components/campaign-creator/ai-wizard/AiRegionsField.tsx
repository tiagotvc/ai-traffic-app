"use client";

import { useTranslations } from "next-intl";

import { ZonePicker } from "@/components/campaign-creator/ZonePicker";
import type { AiCampaignWizardState } from "@/lib/campaign-creator/ai-campaign-wizard-types";

type Props = {
  state: AiCampaignWizardState;
  onChange: (patch: Partial<AiCampaignWizardState>) => void;
};

export function AiRegionsField({ state, onChange }: Props) {
  const t = useTranslations("campaignCreator.aiWizard");

  return (
    <div className="ui-card space-y-4 p-5">
      <div>
        <h2 className="font-heading text-lg font-semibold text-[var(--text-main)]">{t("regionsTitle")}</h2>
        <p className="mt-1 text-sm text-[var(--text-dim)]">{t("regionsHint")}</p>
      </div>

      <div>
        <label className="text-xs font-medium text-[var(--text-dim)]">{t("regionsDescription")}</label>
        <textarea
          value={state.regionsDescription}
          onChange={(e) =>
            onChange({
              regionsDescription: e.target.value,
              selectedZoneId: null,
              zonePreview: null,
              zoneGeoRules: null,
              zoneResolvedName: null
            })
          }
          rows={4}
          placeholder={t("regionsPlaceholder")}
          className="ui-input mt-1 w-full resize-none text-sm"
        />
      </div>

      <div className="border-t border-[var(--border-color)] pt-4">
        <p className="text-xs font-medium text-[var(--text-dim)]">{t("reuseZone")}</p>
        <div className="mt-2">
          <ZonePicker
            value={state.selectedZoneId}
            onChange={(id) =>
              onChange({
                selectedZoneId: id,
                regionsDescription: id ? "" : state.regionsDescription,
                zonePreview: null,
                zoneGeoRules: null,
                zoneResolvedName: null
              })
            }
          />
        </div>
      </div>

      <p className="text-xs text-[var(--text-dimmer)]">{t("regionsDeferredHint")}</p>
    </div>
  );
}
