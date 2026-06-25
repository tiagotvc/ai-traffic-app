"use client";

import { useTranslations } from "next-intl";

import { FormField } from "@/components/ui/FormField";
import type { AiCampaignWizardState } from "@/lib/campaign-creator/ai-campaign-wizard-types";
import type { ConversionLocation, MessagingChannel } from "@/lib/campaign-draft";
import { defaultConversionLocationForObjective } from "@/lib/campaign-draft";

const MESSAGING_CHANNELS: MessagingChannel[] = ["whatsapp", "messenger", "instagram"];

type Props = {
  state: AiCampaignWizardState;
  onChange: (patch: Partial<AiCampaignWizardState>) => void;
};

export function AiOfferDestinationStep({ state, onChange }: Props) {
  const t = useTranslations("campaignCreator");
  const tW = useTranslations("campaignCreator.aiWizard");

  const conversionOptions: { value: ConversionLocation; labelKey: string }[] = [
    { value: "website_and_form", labelKey: "convWebsiteAndForm" },
    { value: "website", labelKey: "convWebsite" },
    { value: "messaging", labelKey: "convMessaging" },
    { value: "calls", labelKey: "convCalls" },
    { value: "app", labelKey: "convApp" }
  ];

  return (
    <div className="ui-card space-y-4 p-5">
      <div>
        <h2 className="font-heading text-lg font-semibold text-[var(--text-main)]">{tW("offerTitle")}</h2>
        <p className="mt-1 text-sm text-[var(--text-dim)]">{tW("offerHint")}</p>
      </div>

      <div>
        <label className="text-xs font-medium text-[var(--text-dim)]">{tW("productDescription")}</label>
        <textarea
          value={state.productDescription}
          onChange={(e) => onChange({ productDescription: e.target.value })}
          rows={4}
          placeholder={tW("productDescriptionPlaceholder")}
          className="ui-input mt-1 w-full resize-none text-sm"
        />
      </div>

      <FormField label={t("conversionLocation")}>
        <select
          className="ui-select w-full text-sm"
          value={state.conversionLocation}
          onChange={(e) =>
            onChange({
              conversionLocation: e.target.value as ConversionLocation,
              messagingChannels:
                e.target.value === "messaging" ? state.messagingChannels : []
            })
          }
        >
          {conversionOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(opt.labelKey)}
            </option>
          ))}
        </select>
      </FormField>

      {state.conversionLocation === "messaging" ? (
        <FormField label={t("messagingChannels")}>
          <div className="flex flex-wrap gap-3">
            {MESSAGING_CHANNELS.map((ch) => (
              <label key={ch} className="flex items-center gap-2 text-sm text-[var(--text-dim)]">
                <input
                  type="checkbox"
                  checked={state.messagingChannels.includes(ch)}
                  onChange={() => {
                    const next = state.messagingChannels.includes(ch)
                      ? state.messagingChannels.filter((c) => c !== ch)
                      : [...state.messagingChannels, ch];
                    onChange({ messagingChannels: next });
                  }}
                />
                {ch}
              </label>
            ))}
          </div>
        </FormField>
      ) : null}

      {state.conversionLocation === "website" ||
      state.conversionLocation === "website_and_form" ? (
        <FormField label={t("linkUrl")}>
          <input
            type="url"
            className="ui-input w-full text-sm"
            value={state.linkUrl}
            onChange={(e) => onChange({ linkUrl: e.target.value })}
            placeholder="https://"
          />
        </FormField>
      ) : null}

      <FormField label={tW("dailyBudget")}>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-dim)]">R$</span>
          <input
            type="number"
            min={1}
            step={1}
            className="ui-input w-full max-w-[200px] text-sm"
            value={state.dailyBudgetBRL}
            onChange={(e) => onChange({ dailyBudgetBRL: Number(e.target.value) || 0 })}
          />
        </div>
        <p className="mt-1 text-[11px] text-[var(--text-dimmer)]">{tW("dailyBudgetHint")}</p>
      </FormField>
    </div>
  );
}

export function applyDefaultConversionForObjective(
  state: AiCampaignWizardState,
  objective: AiCampaignWizardState["objective"]
): Partial<AiCampaignWizardState> {
  return {
    objective,
    conversionLocation: defaultConversionLocationForObjective(objective)
  };
}
