"use client";

import { useTranslations } from "next-intl";

import { MetaDynamicParamInput } from "@/components/campaign-creator/MetaDynamicParamInput";
import { type UtmFields } from "@/lib/campaign-utm";

export const creatorDynamicParamInputClass =
  "w-full rounded-lg border border-[var(--creator-card-border,var(--border-color))] bg-[var(--creator-card-bg-inset,var(--surface-bg))] px-3 py-2 text-xs font-mono text-[var(--text-main)] outline-none transition focus:border-[var(--ui-accent)] placeholder:text-[var(--text-dimmer)] disabled:cursor-not-allowed disabled:opacity-60";

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
    <div className="space-y-3">
      <div>
        <h4 className="campaign-creator-section-title">{t("utmBuilderTitle")}</h4>
        <p className="mt-1 text-[10px] leading-relaxed text-[var(--text-dimmer)]">
          {t("dynamicParamHint")}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map(({ key, label, placeholder }) => (
          <div key={key} className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--text-dim)]">{label}</label>
            <MetaDynamicParamInput
              value={value[key]}
              onChange={(v) => patch({ [key]: v })}
              placeholder={placeholder}
              disabled={disabled}
              className={creatorDynamicParamInputClass}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
