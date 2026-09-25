"use client";

import { useTranslations } from "next-intl";

export function PresetSelect({
  value,
  options,
  onChange
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("audiencesBulk");
  return (
    <label className="block max-w-sm">
      <span className="ui-label">{t("presets.label")}</span>
      <select className="ui-select mt-1 w-full" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="mt-1 block text-[11px] text-[var(--text-dimmer)]">{t("presets.hint")}</span>
    </label>
  );
}
