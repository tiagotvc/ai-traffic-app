"use client";

import { useTranslations } from "next-intl";
import { BarChart2, Building2, RefreshCw, Search } from "lucide-react";
import { useTransition } from "react";

import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { useCommandStripOptional } from "@/components/layout/CommandStripContext";
import { PeriodFilter } from "@/components/PeriodFilter";
import { cn } from "@/lib/cn";

export function CommandStrip() {
  const ctx = useCommandStripOptional();
  const t = useTranslations("dashboard");
  const tSync = useTranslations("sync");
  const [syncing, startSync] = useTransition();

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
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 md:px-6">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {leadingSlot}

          {showSearch ? (
            <div className={pillClass} style={{ ...pillStyle, minWidth: 180, maxWidth: 240 }}>
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

              <PeriodFilter
                value={period}
                onChange={setPeriod}
                variant="commandStrip"
                disabled={periodFilterDisabled}
                disabledHint={periodFilterDisabledHint}
              />
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {middleTrailingSlot}

          {trailingSlot ? (
            trailingSlot
          ) : hideSync ? null : (
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 font-heading text-sm font-semibold shadow-lg transition-all duration-200",
                syncing ? "cursor-wait opacity-70" : "hover:brightness-110 active:scale-95"
              )}
              style={{
                background: "linear-gradient(135deg, #f5a623, #e8920d)",
                color: "#0f1419"
              }}
            >
              <RefreshCw size={14} className={cn(syncing && "animate-spin")} />
              <span>{syncing ? tSync("syncing") : tSync("syncMeta")}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
