"use client";

import { useTranslations } from "next-intl";
import { BarChart2, Building2 } from "lucide-react";

import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { PeriodFilter, type PeriodState } from "@/components/PeriodFilter";

type ClientOption = { slug: string; name: string };
type AdAccount = { id: string; label: string };

export function GlobalScopeFilters({
  clientFilter,
  setClientFilter,
  accountFilter,
  setAccountFilter,
  period,
  setPeriod,
  clientOptions,
  adAccounts,
  periodFilterDisabled = false,
  periodFilterDisabledHint,
  compact = true
}: {
  clientFilter: string;
  setClientFilter: (v: string) => void;
  accountFilter: string;
  setAccountFilter: (v: string) => void;
  period: PeriodState;
  setPeriod: (v: PeriodState) => void;
  clientOptions: ClientOption[];
  adAccounts: AdAccount[];
  periodFilterDisabled?: boolean;
  periodFilterDisabledHint?: string;
  compact?: boolean;
}) {
  const t = useTranslations("dashboard");

  const pillClass = compact
    ? "text-xs [&_button]:py-1.5 [&_button]:text-xs"
    : undefined;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${pillClass ?? ""}`}>
      <FilterSelectDropdown
        icon={<Building2 size={13} />}
        label={t("filterClient")}
        placeholder={t("filterAllClients")}
        value={clientFilter}
        onChange={setClientFilter}
        options={clientOptions.map((c) => ({ value: c.slug, label: c.name }))}
      />
      <FilterSelectDropdown
        icon={<BarChart2 size={13} />}
        label={t("filterAccount")}
        placeholder={t("filterAllAccounts")}
        value={accountFilter}
        onChange={setAccountFilter}
        disabled={!clientFilter && adAccounts.length === 0}
        options={adAccounts.map((a) => ({ value: a.id, label: a.label }))}
      />
      <PeriodFilter
        value={period}
        onChange={setPeriod}
        variant={compact ? "commandStrip" : "modal"}
        disabled={periodFilterDisabled}
        disabledHint={periodFilterDisabledHint}
      />
    </div>
  );
}
