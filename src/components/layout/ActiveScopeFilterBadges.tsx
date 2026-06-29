"use client";

import { useTranslations } from "next-intl";
import { BarChart2, Building2, Calendar, X } from "lucide-react";
import type { ReactNode } from "react";

import { type PeriodState } from "@/components/PeriodFilter";
import { useCommandStripOptional } from "@/components/layout/CommandStripContext";
import { usePageToolbarFiltersOptional } from "@/components/layout/PageToolbarFiltersContext";
import { cn } from "@/lib/cn";

const DEFAULT_PERIOD: PeriodState = { preset: "last30", since: "", until: "" };

function isNonDefaultPeriod(period: PeriodState) {
  return period.preset !== "last30" || Boolean(period.since || period.until);
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

  const badges: Array<{
    id: string;
    label: string;
    icon: ReactNode;
    clearable: boolean;
    onClear?: () => void;
    openAriaLabel: string;
  }> = [
    {
      id: "period",
      label: periodLabel,
      icon: <Calendar size={10} aria-hidden />,
      clearable: isNonDefaultPeriod(strip.period),
      onClear: () => strip.setPeriod(DEFAULT_PERIOD),
      openAriaLabel: `${t("showFilters")}: ${t("filterPeriod")} — ${periodLabel}`
    }
  ];

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
