"use client";

import { useTranslations } from "next-intl";
import { Filter, RefreshCw, Search } from "lucide-react";
import { useState, useTransition } from "react";

import { useCommandStripOptional } from "@/components/layout/CommandStripContext";
import { CommandStripFiltersModal } from "@/components/layout/CommandStripFiltersModal";
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

  const pillStyle = {
    color: "var(--text-main)",
    background: "var(--filter-btn-bg)",
    borderColor: "var(--border-color)"
  };

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {!hideFilters ? (
        <>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className={cn(
              "ui-toolbar-icon-btn relative",
              filtersActive && "ui-toolbar-icon-btn--active"
            )}
            title={t("filtersTitle")}
            aria-label={t("filtersTitle")}
          >
            <Filter size={17} />
            {filtersActive ? (
              <span
                className="absolute right-1 top-1 h-2 w-2 rounded-full"
                style={{ background: "var(--ui-accent)" }}
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
      {leadingSlot}
      {showSearch ? (
        <div
          className="flex h-9 min-w-0 max-w-[120px] items-center gap-1.5 rounded-lg border px-2"
          style={pillStyle}
        >
          <Search size={14} style={{ color: "var(--text-dim)" }} className="shrink-0" />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            className="min-w-0 flex-1 border-none bg-transparent text-xs outline-none"
            style={{ color: "var(--text-main)" }}
          />
        </div>
      ) : null}
      {middleTrailingSlot}
      {trailingSlot}
      {hideSync ? null : (
        <IconLabelButton
          onClick={handleSync}
          disabled={syncing}
          label={syncing ? tSync("syncing") : tSync("syncMeta")}
          icon={<RefreshCw size={15} className={cn(syncing && "animate-spin")} />}
          hideLabelOnMobile
          className={cn(
            "ui-btn-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-heading text-sm font-semibold",
            syncing ? "cursor-wait opacity-70" : "active:scale-95"
          )}
        />
      )}
    </div>
  );
}
