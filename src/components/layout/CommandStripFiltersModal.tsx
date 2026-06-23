"use client";

import { useTranslations } from "next-intl";
import { BarChart2, Building2, X } from "lucide-react";

import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { PeriodFilter } from "@/components/PeriodFilter";
import type { PeriodState } from "@/components/PeriodFilter";

type ClientOption = { slug: string; name: string };
type AdAccount = { id: string; label: string };

export function CommandStripFiltersModal({
  open,
  onClose,
  clientFilter,
  setClientFilter,
  accountFilter,
  setAccountFilter,
  period,
  setPeriod,
  clientOptions,
  adAccounts,
  periodFilterDisabled,
  periodFilterDisabledHint
}: {
  open: boolean;
  onClose: () => void;
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
}) {
  const t = useTranslations("dashboard");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={t("closeFilters")}
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border p-5 shadow-xl"
        style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-heading text-base font-semibold" style={{ color: "var(--text-main)" }}>
            {t("filtersTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border"
            style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
            aria-label={t("closeFilters")}
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <FilterSelectDropdown
            icon={<Building2 size={14} />}
            label={t("filterClient")}
            placeholder={t("filterAllClients")}
            value={clientFilter}
            onChange={setClientFilter}
            options={clientOptions.map((c) => ({ value: c.slug, label: c.name }))}
            className="w-full max-w-none"
          />

          <FilterSelectDropdown
            icon={<BarChart2 size={14} />}
            label={t("filterAccount")}
            placeholder={t("filterAllAccounts")}
            value={accountFilter}
            onChange={setAccountFilter}
            disabled={!clientFilter && adAccounts.length === 0}
            options={adAccounts.map((a) => ({ value: a.id, label: a.label }))}
            className="w-full max-w-none"
          />

          <div>
            <p className="mb-2 text-xs font-medium" style={{ color: "var(--text-dim)" }}>
              {t("filterPeriod")}
            </p>
            <PeriodFilter
              value={period}
              onChange={setPeriod}
              variant="modal"
              disabled={periodFilterDisabled}
              disabledHint={periodFilterDisabledHint}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
