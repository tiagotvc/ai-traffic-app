"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";

import { FormField } from "@/components/ui/FormField";
import { META_URL_DYNAMIC_PARAMS, type UtmFields } from "@/lib/campaign-utm";

type Props = {
  value: UtmFields;
  onChange: (utm: UtmFields) => void;
  disabled?: boolean;
};

type UtmFieldKey = keyof UtmFields;

export function UtmBuilder({ value, onChange, disabled }: Props) {
  const t = useTranslations("campaignCreator");
  const focusedField = useRef<UtmFieldKey>("campaign");

  function patch(partial: Partial<UtmFields>) {
    onChange({ ...value, ...partial });
  }

  function insertToken(token: string) {
    const key = focusedField.current;
    const current = value[key];
    patch({ [key]: current ? `${current}${current.endsWith("_") ? "" : "_"}${token}` : token });
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
      <p className="text-[10px] text-[var(--text-dim)]">{t("utmBuilderHint")}</p>

      <div>
        <p className="text-[10px] font-medium text-[var(--text-dim)]">{t("utmTokenPickerLabel")}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {META_URL_DYNAMIC_PARAMS.map(({ token, labelKey }) => (
            <button
              key={token}
              type="button"
              disabled={disabled}
              onClick={() => insertToken(token)}
              className="rounded-md border border-violet-200 bg-[var(--surface-card)] px-2 py-0.5 font-mono text-[10px] text-[var(--violet)] transition hover:scale-105 hover:border-violet-400 hover:bg-[rgba(124,58,237,0.06)] disabled:opacity-50"
              title={token}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map(({ key, label, placeholder }) => (
          <FormField key={key} label={label}>
            <input
              value={value[key]}
              onChange={(e) => patch({ [key]: e.target.value })}
              onFocus={() => {
                focusedField.current = key;
              }}
              placeholder={placeholder}
              className="ui-input text-xs font-mono"
              disabled={disabled}
            />
          </FormField>
        ))}
      </div>
    </div>
  );
}
