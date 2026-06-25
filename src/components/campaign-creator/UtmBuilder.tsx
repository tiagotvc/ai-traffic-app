"use client";

import { useTranslations } from "next-intl";

import { FormField } from "@/components/ui/FormField";
import { MetaDynamicParamInput } from "@/components/campaign-creator/MetaDynamicParamInput";
import { type UtmFields } from "@/lib/campaign-utm";

type Props = {
  value: UtmFields;
  onChange: (utm: UtmFields) => void;
  disabled?: boolean;
};

type UtmFieldKey = keyof UtmFields;

export function UtmBuilder({ value, onChange, disabled }: Props) {
  const t = useTranslations("campaignCreator");

  function patch(partial: Partial<UtmFields>) {
    onChange({ ...value, ...partial });
  }

  const fields: Array<{ key: UtmFieldKey; label: string; placeholder?: string }> = [
    { key: "source", label: "utm_source" },
    { key: "medium", label: "utm_medium" },
    { key: "campaign", label: "utm_campaign", placeholder: "{{campaign.name}}" },
    { key: "content", label: "utm_content", placeholder: "{{ad.name}}_{{placement}}" },
    { key: "term", label: "utm_term", placeholder: "{{adset.name}}" }
  ];

  return (
    <div className="space-y-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)]/50 p-3">
      <p className="text-xs font-medium text-[var(--text-dim)]">{t("utmBuilderTitle")}</p>
      <p className="text-[10px] text-[var(--text-dimmer)]">{t("dynamicParamHint")}</p>

      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map(({ key, label, placeholder }) => (
          <FormField key={key} label={label}>
            <MetaDynamicParamInput
              value={value[key]}
              onChange={(v) => patch({ [key]: v })}
              placeholder={placeholder}
              disabled={disabled}
            />
          </FormField>
        ))}
      </div>
    </div>
  );
}
