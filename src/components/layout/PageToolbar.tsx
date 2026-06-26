"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { FilterSearchInput } from "@/components/FilterSearchInput";
import { GlobalScopeFilters } from "@/components/layout/GlobalScopeFilters";
import { MetaSyncButton } from "@/components/layout/MetaSyncButton";
import { FilterToggleButton } from "@/components/ui/FilterToggleButton";
import { useCommandStripOptional } from "@/components/layout/CommandStripContext";
import { cn } from "@/lib/cn";

export function PageToolbar({
  eyebrow,
  icon,
  title,
  subtitle,
  search,
  showGlobalFilters = true,
  periodFilterDisabled = false,
  periodFilterDisabledHint,
  pageFilters,
  actions,
  showSync = true,
  showAccountFilter = true,
  className
}: {
  eyebrow?: string;
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
  };
  showGlobalFilters?: boolean;
  periodFilterDisabled?: boolean;
  periodFilterDisabledHint?: string;
  pageFilters?: ReactNode;
  actions?: ReactNode;
  showSync?: boolean;
  showAccountFilter?: boolean;
  className?: string;
}) {
  const t = useTranslations("dashboard");
  const strip = useCommandStripOptional();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const hasGlobalFilters = Boolean(showGlobalFilters && strip);
  const hasPageFilters = Boolean(pageFilters);
  const canFilter = hasGlobalFilters || hasPageFilters;

  return (
    <div className={cn("mb-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="mb-1 font-body text-xs" style={{ color: "var(--text-dim)" }}>
              {eyebrow}
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            {icon ? <div className="ui-toolbar-icon-shell">{icon}</div> : null}
            {typeof title === "string" ? (
              <h1 className="font-heading text-xl font-bold sm:text-2xl" style={{ color: "var(--text-main)" }}>
                {title}
              </h1>
            ) : (
              title
            )}
          </div>
          {subtitle ? (
            <p className="mt-1 font-body text-sm" style={{ color: "var(--text-dim)" }}>
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          {search ? (
            <FilterSearchInput
              size="wide"
              className="h-9 max-w-[240px] sm:max-w-[300px]"
              value={search.value}
              onChange={search.onChange}
              placeholder={search.placeholder}
            />
          ) : null}

          {canFilter ? (
            <FilterToggleButton
              open={filtersOpen}
              showLabel={t("showFilters")}
              hideLabel={t("hideFilters")}
              onClick={() => setFiltersOpen((v) => !v)}
            />
          ) : null}

          {actions}

          {showSync ? <MetaSyncButton clientFilter={strip?.clientFilter} /> : null}
        </div>
      </div>

      {filtersOpen && canFilter ? (
        <div
          className="ui-filter-panel-grid mt-3 rounded-xl border p-3 text-xs [&_button]:py-1.5 [&_button]:text-xs"
          style={{ borderColor: "var(--border-color)", background: "var(--surface-card)" }}
        >
          {hasGlobalFilters ? (
            <GlobalScopeFilters
              layout="flat"
              clientFilter={strip!.clientFilter}
              setClientFilter={strip!.setClientFilter}
              accountFilter={strip!.accountFilter}
              setAccountFilter={strip!.setAccountFilter}
              period={strip!.period}
              setPeriod={strip!.setPeriod}
              clientOptions={strip!.clientOptions}
              adAccounts={strip!.adAccounts}
              periodFilterDisabled={periodFilterDisabled}
              periodFilterDisabledHint={periodFilterDisabledHint}
              showAccount={showAccountFilter}
              compact
            />
          ) : null}
          {pageFilters}
        </div>
      ) : null}
    </div>
  );
}
