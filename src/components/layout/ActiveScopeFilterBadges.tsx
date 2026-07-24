"use client";

import { useTranslations } from "next-intl";
import { BarChart2, Building2, Calendar, X } from "lucide-react";
import type { ReactNode } from "react";

import { type PeriodState } from "@/components/PeriodFilter";
import { GoogleDateRangePicker, type DateRange } from "@/components/GoogleDateRangePicker";
import { useCommandStripOptional } from "@/components/layout/CommandStripContext";
import { usePageToolbarFiltersOptional } from "@/components/layout/PageToolbarFiltersContext";
import { periodStateToParsed } from "@/lib/report-period";
import { cn } from "@/lib/cn";

const DEFAULT_PERIOD: PeriodState = { preset: "last30", since: "", until: "" };

const BADGE_WRAP_CLASS = cn(
  "inline-flex max-w-full items-stretch overflow-hidden rounded-full border text-[10px] font-semibold transition-colors",
  "hover:border-[var(--ui-accent-border)] hover:bg-[var(--ui-accent-muted)]"
);
const BADGE_WRAP_STYLE = {
  borderColor: "var(--chart-frame-border)",
  background: "var(--chart-frame-bg)",
  color: "var(--text-dim)"
} as const;

function isNonDefaultPeriod(period: PeriodState) {
  return period.preset !== "last30" || Boolean(period.since || period.until);
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/** PeriodState → DateRange (since/until) para alimentar o calendário. */
function periodToRange(period: PeriodState): DateRange {
  const parsed = periodStateToParsed(period);
  const until = parsed.until ?? isoToday();
  const since = parsed.since ?? until;
  return { since, until };
}

function FilterBadge({
  label,
  icon,
  clearable,
  onOpenFilters,
  onClear,
  clearAriaLabel,
  openAriaLabel
}: {
  label: string;
  icon: ReactNode;
  clearable: boolean;
  onOpenFilters: () => void;
  onClear?: () => void;
  clearAriaLabel: string;
  openAriaLabel: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-stretch overflow-hidden rounded-full border text-[10px] font-semibold transition-colors",
        "hover:border-[var(--ui-accent-border)] hover:bg-[var(--ui-accent-muted)]"
      )}
      style={{
        borderColor: "var(--chart-frame-border)",
        background: "var(--chart-frame-bg)",
        color: "var(--text-dim)"
      }}
    >
      <button
        type="button"
        className="inline-flex min-w-0 cursor-pointer items-center gap-1 px-2 py-0.5 text-left"
        onClick={onOpenFilters}
        aria-label={openAriaLabel}
      >
        {icon}
        <span className="truncate">{label}</span>
      </button>
      {clearable && onClear ? (
        <button
          type="button"
          className="inline-flex shrink-0 cursor-pointer items-center border-l px-1.5 py-0.5 transition-colors hover:bg-[var(--surface-bg)] hover:text-[var(--text-main)]"
          style={{ borderColor: "var(--chart-frame-border)" }}
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          aria-label={clearAriaLabel}
        >
          <X size={10} strokeWidth={2.5} aria-hidden />
        </button>
      ) : null}
    </span>
  );
}

export function ActiveScopeFilterBadges({ periodLabel }: { periodLabel: string }) {
  const strip = useCommandStripOptional();
  const toolbarFilters = usePageToolbarFiltersOptional();
  const t = useTranslations("dashboard");
  const tCampaignFilters = useTranslations("campaignFilters");

  if (!strip || !toolbarFilters) return null;

  const openFilters = () => toolbarFilters.openFilters();

  const periodClearable = isNonDefaultPeriod(strip.period);

  const badges: Array<{
    id: string;
    label: string;
    icon: ReactNode;
    clearable: boolean;
    onClear?: () => void;
    openAriaLabel: string;
  }> = [];

  if (strip.clientFilter) {
    const name =
      strip.clientOptions.find((c) => c.slug === strip.clientFilter)?.name ?? strip.clientFilter;
    badges.push({
      id: "client",
      label: name,
      icon: <Building2 size={10} aria-hidden />,
      clearable: true,
      onClear: () => strip.setClientFilter(""),
      openAriaLabel: `${t("showFilters")}: ${t("filterClient")} — ${name}`
    });
  }

  if (strip.accountFilter) {
    const name =
      strip.adAccounts.find((a) => a.id === strip.accountFilter)?.label ?? strip.accountFilter;
    badges.push({
      id: "account",
      label: name,
      icon: <BarChart2 size={10} aria-hidden />,
      clearable: true,
      onClear: () => strip.setAccountFilter(""),
      openAriaLabel: `${t("showFilters")}: ${t("filterAccount")} — ${name}`
    });
  }

  return (
    <span className="ml-2 inline-flex flex-wrap items-center gap-1.5">
      {/* Período: o badge abre um calendário direto (não o painel de filtros). */}
      <GoogleDateRangePicker
        value={periodToRange(strip.period)}
        onChange={(r) => strip.setPeriod({ preset: "custom", since: r.since, until: r.until })}
        align="left"
        className="inline-flex max-w-full"
        renderTrigger={({ toggle }) => (
          <span className={BADGE_WRAP_CLASS} style={BADGE_WRAP_STYLE}>
            <button
              type="button"
              className="inline-flex min-w-0 cursor-pointer items-center gap-1 px-2 py-0.5 text-left"
              onClick={toggle}
              aria-label={`${t("filterPeriod")} — ${periodLabel}`}
            >
              <Calendar size={10} aria-hidden />
              <span className="truncate">{periodLabel}</span>
            </button>
            {periodClearable ? (
              <button
                type="button"
                className="inline-flex shrink-0 cursor-pointer items-center border-l px-1.5 py-0.5 transition-colors hover:bg-[var(--surface-bg)] hover:text-[var(--text-main)]"
                style={{ borderColor: "var(--chart-frame-border)" }}
                onClick={(e) => {
                  e.stopPropagation();
                  strip.setPeriod(DEFAULT_PERIOD);
                }}
                aria-label={tCampaignFilters("removeFilter")}
              >
                <X size={10} strokeWidth={2.5} aria-hidden />
              </button>
            ) : null}
          </span>
        )}
      />
      {badges.map((badge) => (
        <FilterBadge
          key={badge.id}
          label={badge.label}
          icon={badge.icon}
          clearable={badge.clearable}
          onClear={badge.onClear}
          onOpenFilters={openFilters}
          openAriaLabel={badge.openAriaLabel}
          clearAriaLabel={tCampaignFilters("removeFilter")}
        />
      ))}
    </span>
  );
}
