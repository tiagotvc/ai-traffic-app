"use client";

import { Building2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { useAgencyBrainClient } from "@/components/agency-brain/AgencyBrainClientContext";
import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";

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
      <FilterSelectDropdown
        icon={<Building2 size={14} />}
        label={t("clientPickerLabel")}
        placeholder={t("clientPickerPlaceholder")}
        value={clientSlug}
        onChange={onClientChange}
        clearable={false}
        options={clients.map((c) => ({ value: c.slug, label: c.name }))}
      />
      {hint ? <p className="mt-1 text-[11px] text-[var(--text-dim)]">{hint}</p> : null}
    </div>
  );
}
