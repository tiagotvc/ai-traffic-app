"use client";

import { useTranslations } from "next-intl";
import { BarChart2, Building2, Filter, RefreshCw, Search } from "lucide-react";
import { useState, useTransition } from "react";

import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { useCommandStripOptional } from "@/components/layout/CommandStripContext";
import { CommandStripFiltersModal } from "@/components/layout/CommandStripFiltersModal";
import { PeriodFilter } from "@/components/PeriodFilter";
import { IconLabelButton } from "@/components/ui/IconLabelButton";
import { cn } from "@/lib/cn";

function SyncButton({
  syncing,
  onClick
}: {
  syncing: boolean;
  onClick: () => void;
}) {
  const tSync = useTranslations("sync");
  return (
    <IconLabelButton
      onClick={onClick}
      disabled={syncing}
      label={syncing ? tSync("syncing") : tSync("syncMeta")}
      icon={<RefreshCw size={16} className={cn(syncing && "animate-spin")} />}
      hideLabelOnMobile
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-heading text-sm font-semibold shadow-lg transition-all duration-200 lg:h-auto lg:w-auto lg:gap-2 lg:px-4 lg:py-2",
        syncing ? "cursor-wait opacity-70" : "hover:brightness-110 active:scale-95"
      )}
      style={{
        background: "linear-gradient(135deg, #f5a623, #e8920d)",
        color: "#0f1419"
      }}
    />
  );
}

export function CommandStrip() {
  const ctx = useCommandStripOptional();
  const t = useTranslations("dashboard");
  const [syncing, startSync] = useTransition();
  const [filtersOpen, setFiltersOpen] = useState(false);

  if (!ctx) return null;

  const {
    clientFilter,
    setClientFilter,
    accountFilter,
    setAccountFilter,
    period,
    setPeriod,
    clientOptions,
    adAccounts,
    pageConfig
  } = ctx;

  const {
    hideFilters = false,
    hideSync = false,
    periodFilterDisabled = false,
    periodFilterDisabledHint,
    searchPlaceholder,
    searchValue = "",
    onSearchChange,
    leadingSlot,
    middleTrailingSlot,
    trailingSlot
  } = pageConfig;

  const showSearch = Boolean(onSearchChange && searchPlaceholder);

  if (
    hideFilters &&
    hideSync &&
    !showSearch &&
    !middleTrailingSlot &&
    !trailingSlot &&
    !leadingSlot
  ) {
    return null;
  }

  function handleSync() {
    if (syncing) return;
    startSync(async () => {
      const res = await fetch("/api/sync/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientId: clientFilter || undefined })
      });
      if (res.ok) {
        window.dispatchEvent(new Event("traffic-sync-done"));
      }
    });
  }

  const pillClass =
    "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all duration-200 whitespace-nowrap";
  const pillStyle = {
    color: "var(--text-main)",
    background: "var(--filter-btn-bg)",
    borderColor: "var(--border-color)"
  };

  const filtersActive =
    !hideFilters && Boolean(clientFilter || accountFilter || period.preset !== "last30");

  const actions = (
    <>
      {leadingSlot}
      {showSearch ? (
        <div className={cn(pillClass, "min-w-0 flex-1 lg:min-w-[180px] lg:max-w-[240px]")} style={pillStyle}>
          <Search size={14} style={{ color: "var(--text-dim)" }} className="shrink-0" />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            className="min-w-0 flex-1 border-none bg-transparent text-sm outline-none"
            style={{ color: "var(--text-main)" }}
          />
        </div>
      ) : null}
      {middleTrailingSlot}
      {trailingSlot}
      {hideSync ? null : <SyncButton syncing={syncing} onClick={handleSync} />}
    </>
  );

  return (
    <div
      className="sticky top-0 z-30 w-full shrink-0 border-b backdrop-blur-md"
      style={{
        background: "var(--surface-header)",
        borderColor: "var(--border-color)"
      }}
    >
      {/* Mobile: só ícone de filtro + ações */}
      <div className="flex items-center gap-2 px-3 py-2 lg:hidden">
        {!hideFilters ? (
          <>
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-all duration-200"
              style={{
                ...pillStyle,
                borderColor: filtersActive ? "var(--amber-bright)" : "var(--border-color)",
                boxShadow: filtersActive ? "0 0 0 1px rgba(245,166,35,0.25)" : undefined
              }}
              title={t("filtersTitle")}
              aria-label={t("filtersTitle")}
            >
              <Filter size={18} />
              {filtersActive ? (
                <span
                  className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full"
                  style={{ background: "var(--amber-bright)" }}
                />
              ) : null}
            </button>
            <CommandStripFiltersModal
              open={filtersOpen}
              onClose={() => setFiltersOpen(false)}
              clientFilter={clientFilter}
              setClientFilter={setClientFilter}
              accountFilter={accountFilter}
              setAccountFilter={setAccountFilter}
              period={period}
              setPeriod={setPeriod}
              clientOptions={clientOptions}
              adAccounts={adAccounts}
              periodFilterDisabled={periodFilterDisabled}
              periodFilterDisabledHint={periodFilterDisabledHint}
            />
          </>
        ) : null}
        <div className="ml-auto flex min-w-0 items-center justify-end gap-2">{actions}</div>
      </div>

      {/* Desktop: filtros inline */}
      <div className="hidden flex-wrap items-center gap-2 px-6 py-3 lg:flex">
        {!hideFilters ? (
          <>
            <FilterSelectDropdown
              icon={<Building2 size={14} />}
              label={t("filterClient")}
              placeholder={t("filterAllClients")}
              value={clientFilter}
              onChange={setClientFilter}
              options={clientOptions.map((c) => ({ value: c.slug, label: c.name }))}
            />
            <FilterSelectDropdown
              icon={<BarChart2 size={14} />}
              label={t("filterAccount")}
              placeholder={t("filterAllAccounts")}
              value={accountFilter}
              onChange={setAccountFilter}
              disabled={!clientFilter && adAccounts.length === 0}
              options={adAccounts.map((a) => ({ value: a.id, label: a.label }))}
            />
            <div className="shrink-0">
              <PeriodFilter
                value={period}
                onChange={setPeriod}
                variant="commandStrip"
                disabled={periodFilterDisabled}
                disabledHint={periodFilterDisabledHint}
              />
            </div>
          </>
        ) : null}
        <div className="ml-auto flex min-w-0 items-center gap-2">{actions}</div>
      </div>
    </div>
  );
}
