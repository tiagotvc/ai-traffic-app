"use client";

import { useTranslations } from "next-intl";
import { BarChart2, Building2, Layers, Search } from "lucide-react";

import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { PeriodFilter } from "@/components/PeriodFilter";
import { useCommandStripOptional } from "@/components/layout/CommandStripContext";
import { CAMPAIGN_PRESETS } from "@/lib/campaign-presets";
import type { FilterBlockConfig } from "@/lib/dashboard/app-block-config";
import { periodStateFromWidgetPreset } from "@/lib/dashboard/widget-period";
import type { ExtendedPeriodPreset } from "@/lib/dashboard/extended-period";

export function AppScopeFiltersBar({
  config,
  onPatch,
  compact = true,
  readOnly = false
}: {
  config: FilterBlockConfig;
  onPatch: (patch: Partial<FilterBlockConfig>) => void;
  compact?: boolean;
  readOnly?: boolean;
}) {
  const t = useTranslations("dashboard");
  const tPresets = useTranslations("campaignPresets");
  const tW = useTranslations("dashboardWidgets");
  const strip = useCommandStripOptional();

  const showClient = config.showClient !== false;
  const showAccount = config.showAccount !== false;
  const showPeriod = config.showPeriod !== false;
  const showSearch = config.showSearch === true;
  const showPreset = config.showPreset === true;

  const clientFilter = config.clientFilter ?? "";
  const accountFilter = config.accountFilter ?? "";
  const searchQuery = config.searchQuery ?? "";
  const presetFilter = config.presetFilter ?? "";
  const periodPreset = (config.periodPreset as ExtendedPeriodPreset) ?? "last30";
  const period = periodStateFromWidgetPreset(periodPreset);

  const clientOptions = strip?.clientOptions ?? [];
  const adAccounts = strip?.adAccounts ?? [];

  const presetOptions = CAMPAIGN_PRESETS.map((key) => ({
    value: key,
    label: tPresets(key)
  }));

  const controls = [
    showSearch ? (
      <div
        key="search"
        className="flex min-w-[140px] max-w-[200px] items-center gap-2 rounded-lg border px-2.5 py-1.5"
        style={{ borderColor: "var(--border-color)", background: "var(--filter-btn-bg)" }}
      >
        <Search size={13} style={{ color: "var(--text-dim)" }} />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onPatch({ searchQuery: e.target.value })}
          disabled={readOnly}
          placeholder={tW("filterSearchPlaceholder")}
          className="min-w-0 flex-1 border-none bg-transparent text-xs outline-none"
          style={{ color: "var(--text-main)" }}
        />
      </div>
    ) : null,
    showClient ? (
      <FilterSelectDropdown
        key="client"
        icon={<Building2 size={13} />}
        label={t("filterClient")}
        placeholder={t("filterAllClients")}
        value={clientFilter}
        onChange={(v) => onPatch({ clientFilter: v, accountFilter: "" })}
        disabled={readOnly}
        options={clientOptions.map((c) => ({ value: c.slug, label: c.name }))}
      />
    ) : null,
    showAccount ? (
      <FilterSelectDropdown
        key="account"
        icon={<BarChart2 size={13} />}
        label={t("filterAccount")}
        placeholder={t("filterAllAccounts")}
        value={accountFilter}
        onChange={(v) => onPatch({ accountFilter: v })}
        disabled={readOnly || (!clientFilter && adAccounts.length === 0)}
        options={adAccounts.map((a) => ({ value: a.id, label: a.label }))}
      />
    ) : null,
    showPreset ? (
      <FilterSelectDropdown
        key="preset"
        icon={<Layers size={13} />}
        label={tW("filterPanelPreset")}
        placeholder={tW("filterAllPresets")}
        value={presetFilter}
        onChange={(v) => onPatch({ presetFilter: v })}
        disabled={readOnly}
        options={presetOptions}
      />
    ) : null,
    showPeriod ? (
      <PeriodFilter
        key="period"
        value={period}
        onChange={(p) => onPatch({ periodPreset: p.preset as ExtendedPeriodPreset })}
        variant="modal"
        disabled={readOnly}
      />
    ) : null
  ].filter(Boolean);

  if (!controls.length) {
    return (
      <span className="text-xs text-[var(--text-dim)]">{tW("filterBlockEmpty")}</span>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "text-xs" : ""}`}>
      {controls}
    </div>
  );
}
