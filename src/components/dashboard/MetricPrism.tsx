"use client";

import { SparklineChart } from "@/components/dashboard/SparklineChart";
import { cn } from "@/lib/cn";

export type KpiCard = {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
  color: string;
  sparkData: number[];
  sparkLabels?: string[];
  formatSparkValue?: (value: number) => string;
  subLabel: string;
};

export type SecondaryMetric = {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
};

function TrendBadge({
  change,
  trend,
  small
}: {
  change: string;
  trend: "up" | "down" | "neutral";
  small?: boolean;
}) {
  const isUp = trend === "up";
  const isNeutral = trend === "neutral";
  const color = isNeutral ? "#94a3b8" : isUp ? "#10b981" : "#ef4444";

  return (
    <span
      className={cn(
        "flex items-center gap-0.5 rounded font-medium",
        small ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
      )}
      style={{ background: `${color}15`, color }}
    >
      {!isNeutral ? (
        <svg className={small ? "h-2 w-2" : "h-2.5 w-2.5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          {isUp ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          )}
        </svg>
      ) : null}
      {change}
    </span>
  );
}

function KpiCardTile({ kpi, className }: { kpi: KpiCard; className?: string }) {
  return (
    <div
      className={cn(
        "kpi-card-hover flex h-full min-h-0 min-w-0 flex-col rounded-2xl p-4 sm:p-5",
        className
      )}
      style={{
        background: "var(--surface-bg)",
        border: "1px solid var(--border-color)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)"
      }}
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <span
          className="truncate text-xs uppercase tracking-widest"
          style={{ color: "var(--text-dimmer)" }}
        >
          {kpi.label}
        </span>
        <TrendBadge change={kpi.change} trend={kpi.trend} />
      </div>
      <div
        className="mb-1 mt-2 truncate font-bold leading-none"
        style={{
          fontSize: "clamp(1.25rem, 2.5vw, 2rem)",
          color: kpi.color,
          fontFamily: "var(--font-heading)"
        }}
      >
        {kpi.value}
      </div>
      <p className="mb-2 text-[11px]" style={{ color: "var(--text-dim)" }}>
        {kpi.subLabel}
      </p>
      <div className="mt-auto h-12 min-h-[48px] w-full">
        <SparklineChart
          data={kpi.sparkData}
          labels={kpi.sparkLabels}
          color={kpi.color}
          formatValue={kpi.formatSparkValue}
        />
      </div>
    </div>
  );
}

function PrimaryKpiGrid({ primaryKPIs, isLoading }: { primaryKPIs: KpiCard[]; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <div className="grid h-full grid-cols-1 gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border p-5"
            style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
          >
            <div className="skeleton-shimmer mb-4 h-3 w-20 rounded" />
            <div className="skeleton-shimmer mb-2 h-10 w-32 rounded" />
            <div className="skeleton-shimmer mb-3 h-2 w-full rounded" />
            <div className="skeleton-shimmer h-12 w-full rounded" />
          </div>
        ))}
      </div>
    );
  }

  const cols = Math.min(Math.max(primaryKPIs.length, 1), 3);

  return (
    <div
      className="grid h-full w-full gap-3"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {primaryKPIs.map((kpi) => (
        <KpiCardTile key={kpi.label} kpi={kpi} />
      ))}
    </div>
  );
}

export function MetricPrismPrimary({ primaryKPIs, isLoading }: { primaryKPIs: KpiCard[]; isLoading?: boolean }) {
  return (
    <div className="h-full min-h-0 w-full">
      <PrimaryKpiGrid primaryKPIs={primaryKPIs} isLoading={isLoading} />
    </div>
  );
}

export function MetricKpiCard({ kpi, isLoading }: { kpi: KpiCard; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <div
        className="h-full rounded-xl border p-5"
        style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
      >
        <div className="skeleton-shimmer mb-4 h-3 w-20 rounded" />
        <div className="skeleton-shimmer mb-2 h-10 w-32 rounded" />
        <div className="skeleton-shimmer mb-3 h-2 w-full rounded" />
        <div className="skeleton-shimmer h-12 w-full rounded" />
      </div>
    );
  }
  return <KpiCardTile kpi={kpi} />;
}

export function MetricPrism({
  primaryKPIs,
  secondaryMetrics,
  isLoading
}: {
  primaryKPIs: KpiCard[];
  secondaryMetrics: SecondaryMetric[];
  /** Show loading skeleton only while fetching — not for empty accounts. */
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <PrimaryKpiGrid primaryKPIs={[]} isLoading />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton-shimmer h-9 w-28 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PrimaryKpiGrid primaryKPIs={primaryKPIs} />

      <div className="flex flex-wrap gap-2">
        {secondaryMetrics.map((m) => (
          <div
            key={m.label}
            className="flex cursor-default items-center gap-2 rounded-xl px-3 py-2 transition-colors"
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--border-color)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)"
            }}
          >
            <span className="text-xs" style={{ color: "var(--text-dimmer)" }}>
              {m.label}
            </span>
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--text-main)", fontFamily: "var(--font-heading)" }}
            >
              {m.value}
            </span>
            <TrendBadge change={m.change} trend={m.trend} small />
          </div>
        ))}
      </div>
    </div>
  );
}
