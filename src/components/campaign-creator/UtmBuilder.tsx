"use client";

import { useTranslations } from "next-intl";

import { FormField } from "@/components/ui/FormField";
import type { UtmFields } from "@/lib/campaign-utm";

type Props = {
  value: UtmFields;
  onChange: (utm: UtmFields) => void;
  disabled?: boolean;
};

export function UtmBuilder({ value, onChange, disabled }: Props) {
  const t = useTranslations("campaignCreator");

  function patch(partial: Partial<UtmFields>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
      <p className="text-xs font-medium text-slate-700">{t("utmBuilderTitle")}</p>
      <p className="text-[10px] text-slate-500">{t("utmBuilderHint")}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <FormField label="utm_source">
          <input
            value={value.source}
            onChange={(e) => patch({ source: e.target.value })}
            className="ui-input text-xs"
            disabled={disabled}
          />
        </FormField>
        <FormField label="utm_medium">
          <input
            value={value.medium}
            onChange={(e) => patch({ medium: e.target.value })}
            className="ui-input text-xs"
            disabled={disabled}
          />
        </FormField>
        <FormField label="utm_campaign">
          <input
            value={value.campaign}
            onChange={(e) => patch({ campaign: e.target.value })}
            placeholder="{{campaign.name}}"
            className="ui-input text-xs"
            disabled={disabled}
          />
        </FormField>
        <FormField label="utm_content">
          <input
            value={value.content}
            onChange={(e) => patch({ content: e.target.value })}
            placeholder="{{ad.name}}"
            className="ui-input text-xs"
            disabled={disabled}
          />
        </FormField>
        <FormField label="utm_term">
          <input
            value={value.term}
            onChange={(e) => patch({ term: e.target.value })}
            className="ui-input text-xs"
            disabled={disabled}
          />
        </FormField>
      </div>
    </div>
  );
}
