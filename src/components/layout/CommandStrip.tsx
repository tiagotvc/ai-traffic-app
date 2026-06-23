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

export function CommandStrip() {
  const ctx = useCommandStripOptional();
  const t = useTranslations("dashboard");
  const tSync = useTranslations("sync");
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

  return (
    <div
      className="sticky top-0 z-30 w-full shrink-0 border-b backdrop-blur-md"
      style={{
        background: "var(--surface-header)",
        borderColor: "var(--border-color)"
      }}
    >
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 md:px-6 md:py-3">
        {!hideFilters ? (
          <>
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className={cn(pillClass, "shrink-0 md:hidden")}
              style={pillStyle}
              title={t("filtersTitle")}
              aria-label={t("filtersTitle")}
            >
              <Filter size={16} />
            </button>

            <div className="hidden min-w-0 gap-2 md:flex md:flex-wrap">
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
            </div>

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

        <div className="flex min-w-0 flex-1 items-center gap-2">
          {leadingSlot}

          {showSearch ? (
            <div className={cn(pillClass, "min-w-0 flex-1 sm:min-w-[180px] sm:max-w-[240px]")} style={pillStyle}>
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

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {middleTrailingSlot}

            {trailingSlot}

            {hideSync ? null : (
              <IconLabelButton
                onClick={handleSync}
                disabled={syncing}
                label={syncing ? tSync("syncing") : tSync("syncMeta")}
                icon={<RefreshCw size={16} className={cn(syncing && "animate-spin")} />}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg font-heading text-sm font-semibold shadow-lg transition-all duration-200 sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-2",
                  syncing ? "cursor-wait opacity-70" : "hover:brightness-110 active:scale-95"
                )}
                style={{
                  background: "linear-gradient(135deg, #f5a623, #e8920d)",
                  color: "#0f1419"
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
