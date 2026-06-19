"use client";

import { useTranslations } from "next-intl";

import { useAgencyBrainClient } from "@/components/agency-brain/AgencyBrainClientContext";

type AgencyBrainClientFieldProps = {
  className?: string;
  hint?: string;
};

export function AgencyBrainClientField({ className, hint }: AgencyBrainClientFieldProps) {
  const t = useTranslations("agencyBrain");
  const { clientSlug, clients, onClientChange } = useAgencyBrainClient();

  if (clients.length === 0) return null;

  return (
    <div className={className}>
      <label className="ui-label">{t("clientPickerLabel")}</label>
      <select
        className="ui-select mt-1.5 max-w-md text-sm"
        value={clientSlug}
        onChange={(e) => onClientChange(e.target.value)}
        aria-label={t("clientPickerLabel")}
      >
        <option value="">{t("clientPickerPlaceholder")}</option>
        {clients.map((c) => (
          <option key={c.id} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
      {hint ? <p className="mt-1 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
}
