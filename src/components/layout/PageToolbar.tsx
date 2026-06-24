"use client";

import { useRef, useState, type ReactNode } from "react";
import { Filter, Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { GlobalScopeFilters } from "@/components/layout/GlobalScopeFilters";
import { MetaSyncButton } from "@/components/layout/MetaSyncButton";
import { useCommandStripOptional } from "@/components/layout/CommandStripContext";
import { useDismissOnOutsideClick } from "@/hooks/useDismissOnOutsideClick";
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
  className?: string;
}) {
  const t = useTranslations("dashboard");
  const strip = useCommandStripOptional();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const hasGlobalFilters = Boolean(showGlobalFilters && strip);
  const hasPageFilters = Boolean(pageFilters);
  const canFilter = hasGlobalFilters || hasPageFilters;

  const filtersActive =
    hasGlobalFilters &&
    Boolean(
      strip!.clientFilter ||
        strip!.accountFilter ||
        strip!.period.preset !== "last30"
    );

  const filterBtnActive = filtersOpen || filtersActive;

  useDismissOnOutsideClick(rootRef, filtersOpen && canFilter, () => setFiltersOpen(false));

  return (
    <div ref={rootRef} className={cn("mb-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="mb-1 font-body text-xs" style={{ color: "var(--text-dim)" }}>
              {eyebrow}
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            {icon ? (
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ background: "rgba(245,166,35,0.15)" }}
              >
                {icon}
              </div>
            ) : null}
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
            <div
              className="flex h-9 min-w-[140px] max-w-[200px] items-center gap-2 rounded-lg border px-2.5 sm:min-w-[180px] sm:max-w-[240px]"
              style={{
                background: "var(--surface-card)",
                borderColor: "var(--border-color)"
              }}
            >
              <Search size={14} className="shrink-0" style={{ color: "var(--text-dim)" }} />
              <input
                type="search"
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                placeholder={search.placeholder}
                className="min-w-0 flex-1 border-none bg-transparent text-sm outline-none"
                style={{ color: "var(--text-main)" }}
              />
            </div>
          ) : null}

          {canFilter ? (
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              title={t("filtersTitle")}
              aria-label={t("filtersTitle")}
              aria-pressed={filtersOpen}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-all duration-200",
                filterBtnActive && "shadow-sm"
              )}
              style={{
                background: filterBtnActive ? "rgba(245,166,35,0.12)" : "var(--surface-card)",
                borderColor: filterBtnActive ? "var(--amber-bright)" : "var(--border-color)",
                color: filterBtnActive ? "#f5a623" : "var(--text-dim)"
              }}
            >
              <Filter size={16} />
            </button>
          ) : null}

          {actions}

          {showSync ? <MetaSyncButton clientFilter={strip?.clientFilter} /> : null}
        </div>
      </div>

      {filtersOpen && canFilter ? (
        <div
          className="mt-3 flex flex-col gap-2.5 rounded-xl border p-3"
          style={{ borderColor: "var(--border-color)", background: "var(--surface-card)" }}
        >
          {hasGlobalFilters ? (
            <GlobalScopeFilters
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
              compact
            />
          ) : null}
          {pageFilters}
        </div>
      ) : null}
    </div>
  );
}
