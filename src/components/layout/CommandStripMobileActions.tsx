"use client";

import { useTranslations } from "next-intl";
import { Filter, RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";

import { FilterSearchInput } from "@/components/FilterSearchInput";
import { useCommandStripOptional } from "@/components/layout/CommandStripContext";
import { CommandStripFiltersModal } from "@/components/layout/CommandStripFiltersModal";
import { FilterToggleButton } from "@/components/ui/FilterToggleButton";
import { IconLabelButton } from "@/components/ui/IconLabelButton";
import { cn } from "@/lib/cn";

export function CommandStripMobileActions() {
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

  const filtersActive =
    !hideFilters && Boolean(clientFilter || accountFilter || period.preset !== "last30");

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {!hideFilters ? (
        <>
          <FilterToggleButton
            open={filtersOpen}
            showLabel={t("showFilters")}
            hideLabel={t("hideFilters")}
            onClick={() => setFiltersOpen((open) => !open)}
            icon={
              <span className="relative inline-flex">
                <Filter size={17} />
                {!filtersOpen && filtersActive ? (
                  <span
                    className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-2 ring-[var(--surface-header)]"
                    style={{ background: "var(--ui-accent)" }}
                  />
                ) : null}
              </span>
            }
          />
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
      {leadingSlot}
      {showSearch ? (
        <FilterSearchInput
          size="compact"
          className="h-9 min-w-0 max-w-[180px] flex-1"
          value={searchValue}
          onChange={(v) => onSearchChange?.(v)}
          placeholder={searchPlaceholder ?? ""}
        />
      ) : null}
      {middleTrailingSlot}
      {trailingSlot}
      {hideSync ? null : (
        <IconLabelButton
          onClick={handleSync}
          disabled={syncing}
          label={syncing ? tSync("syncing") : tSync("syncMeta")}
          icon={<RefreshCw size={15} className={cn(syncing && "animate-spin")} />}
          className={cn(
            "ui-btn-accent-outline",
            syncing ? "cursor-wait opacity-70" : "active:scale-95"
          )}
        />
      )}
    </div>
  );
}
