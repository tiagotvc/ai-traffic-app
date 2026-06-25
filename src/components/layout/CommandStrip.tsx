"use client";

import { useTranslations } from "next-intl";
import { BarChart2, Building2, RefreshCw } from "lucide-react";
import { useTransition } from "react";

import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { FilterSearchInput } from "@/components/FilterSearchInput";
import { useCommandStripOptional } from "@/components/layout/CommandStripContext";
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
        "ui-btn-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-heading text-sm font-semibold lg:h-auto lg:w-auto lg:gap-2 lg:px-4 lg:py-2",
        syncing ? "cursor-wait opacity-70" : "active:scale-95"
      )}
    />
  );
}

export function CommandStrip() {
  const ctx = useCommandStripOptional();
  const t = useTranslations("dashboard");
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

  const actions = (
    <>
      {leadingSlot}
      {showSearch ? (
        <FilterSearchInput
          size="wide"
          className="max-w-[360px]"
          value={searchValue}
          onChange={(v) => onSearchChange?.(v)}
          placeholder={searchPlaceholder ?? ""}
        />
      ) : null}
      {middleTrailingSlot}
      {trailingSlot}
      {hideSync ? null : <SyncButton syncing={syncing} onClick={handleSync} />}
    </>
  );

  return (
    <div
      className="sticky top-0 z-30 hidden w-full shrink-0 border-b backdrop-blur-md lg:block"
      style={{
        background: "var(--surface-header)",
        borderColor: "var(--border-color)"
      }}
    >
      <div className="flex flex-wrap items-center gap-2 px-6 py-3">
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
