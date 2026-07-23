"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { FilterSearchInput } from "@/components/FilterSearchInput";
import { GlobalScopeFilters } from "@/components/layout/GlobalScopeFilters";
import { PageFilterBar } from "@/components/layout/PageFilterBar";
import { PeriodFilter } from "@/components/PeriodFilter";
import { MetaSyncButton } from "@/components/layout/MetaSyncButton";
import { FilterToggleButton } from "@/components/ui/FilterToggleButton";
import { useCommandStripOptional } from "@/components/layout/CommandStripContext";
import { PageToolbarFiltersProvider } from "@/components/layout/PageToolbarFiltersContext";
import { PageTitleBlock } from "@/design-system/components/PageTitleBlock";
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
  filterCreatorFields = false,
  defaultFiltersOpen = false,
  periodAtEnd = false,
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
  /** Inset creator field styling inside the filter panel (Destaques / Reports pattern). */
  filterCreatorFields?: boolean;
  /** Filtros já expandidos por padrão (ex.: lista de campanhas). */
  defaultFiltersOpen?: boolean;
  /** Move o filtro de Período para o fim (depois dos pageFilters) em vez de ao lado do Cliente. */
  periodAtEnd?: boolean;
  className?: string;
}) {
  const t = useTranslations("dashboard");
  const strip = useCommandStripOptional();
  const [filtersOpen, setFiltersOpen] = useState(defaultFiltersOpen);

  const hasGlobalFilters = Boolean(showGlobalFilters && strip);
  const hasPageFilters = Boolean(pageFilters);
  const canFilter = hasGlobalFilters || hasPageFilters;

  return (
    <PageToolbarFiltersProvider filtersOpen={filtersOpen} setFiltersOpen={setFiltersOpen}>
      <div className={cn("mb-5", className)}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {eyebrow ? (
              <p className="mb-1 font-body text-xs text-[var(--text-dim)]">{eyebrow}</p>
            ) : null}
            <PageTitleBlock title={title} subtitle={subtitle} titleIcon={icon} />
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
          <PageFilterBar>
            {hasGlobalFilters ? (
              <GlobalScopeFilters
                layout="flat"
                creatorField={filterCreatorFields}
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
                showPeriod={!periodAtEnd}
                compact
              />
            ) : null}
            {pageFilters}
            {hasGlobalFilters && periodAtEnd ? (
              <div className="ui-filter-panel-field">
                <PeriodFilter
                  value={strip!.period}
                  onChange={strip!.setPeriod}
                  creatorField={filterCreatorFields}
                  variant="commandStrip"
                  disabled={periodFilterDisabled}
                  disabledHint={periodFilterDisabledHint}
                />
              </div>
            ) : null}
          </PageFilterBar>
        ) : null}
      </div>
    </PageToolbarFiltersProvider>
  );
}
