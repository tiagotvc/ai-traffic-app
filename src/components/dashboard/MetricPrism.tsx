"use client";

import { useTranslations } from "next-intl";

import { SparklineChart } from "@/components/dashboard/SparklineChart";
import { MetricKpiIcon } from "@/components/dashboard/MetricKpiIcon";
import { useAppDarkMode } from "@/hooks/useAppDarkMode";
import { cn } from "@/lib/cn";
import {
  metricKpiChartFrame,
  metricKpiIconShell,
  metricKpiTrendColors
} from "@/lib/dashboard/metric-kpi-theme";
import { type MetricKey } from "@/lib/dashboard-metrics";

export type KpiCard = {
  metricKey?: MetricKey;
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
  key?: MetricKey;
  label: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
  subLabel?: string;
  color?: string;
};

function resolveDeltaChangeLabel(change: string, tDash: (key: "deltaNew") => string): string {
  if (change === "dashboard.deltaNew" || change === "deltaNew") {
    return tDash("deltaNew");
  }
  return change;
}

function TrendBadge({
  change,
  trend,
  small,
  dark = false
}: {
  change: string;
  trend: "up" | "down" | "neutral";
  small?: boolean;
  dark?: boolean;
}) {
  const tDash = useTranslations("dashboard");
  const isUp = trend === "up";
  const isNeutral = trend === "neutral";
  const { color, background } = metricKpiTrendColors(trend, dark);
  const displayChange = resolveDeltaChangeLabel(change, tDash);

  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-0.5 rounded-full font-semibold tabular-nums",
        small ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
      )}
      style={{ background, color }}
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
      {displayChange}
    </span>
  );
}

/** Responsive KPI grid: 2 cols mobile → 3 tablet → 4 desktop → 5 wide. */
export const KPI_GRID_CLASS =
  "grid w-full grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

function KpiCardTile({
  kpi,
  index,
  forceDark
}: {
  kpi: KpiCard;
  index: number;
  forceDark?: boolean;
}) {
  const themeDark = useAppDarkMode();
  const dark = forceDark ?? themeDark;
  const accent = kpi.color;
  const iconShell = metricKpiIconShell(accent, dark);
  const chartFrame = metricKpiChartFrame(accent, dark);

  return (
    <div
      className={cn(
        "dashboard-kpi-card dashboard-kpi-card--period dashboard-kpi-card--hero kpi-card-hover animate-fade-up flex min-w-0 flex-col",
        !dark && "dashboard-kpi-card--light"
      )}
      style={{
        animationDelay: `${index * 60}ms`,
        animationFillMode: "both"
      }}
    >
      <div className="mb-1.5 flex items-start justify-between gap-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <div
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
            style={iconShell}
          >
            <MetricKpiIcon metricKey={kpi.metricKey} color={accent} size={11} />
          </div>
          <span
            className="truncate text-[9px] font-semibold uppercase tracking-wide"
            style={{ color: dark ? "#94a3b8" : "var(--text-dimmer)" }}
          >
            {kpi.label}
          </span>
        </div>
        <TrendBadge change={kpi.change} trend={kpi.trend} small dark={dark} />
      </div>

      <div
        className="truncate font-heading text-[15px] font-bold leading-tight tabular-nums tracking-tight"
        style={{ color: "var(--text-main)", fontFamily: "var(--font-heading)" }}
      >
        {kpi.value}
      </div>

      <p
        className="mt-0.5 truncate text-[8px] leading-snug"
        style={{ color: dark ? "#64748b" : "var(--text-dimmer)" }}
      >
        {kpi.subLabel}
      </p>

      <div
        className="dashboard-kpi-card__spark mt-auto w-full shrink-0 pt-1"
        style={chartFrame}
      >
        <SparklineChart
          data={kpi.sparkData}
          labels={kpi.sparkLabels}
          color={accent}
          formatValue={kpi.formatSparkValue}
          variant="creator"
          dark={dark}
        />
      </div>
    </div>
  );
}

function PeriodMetricTile({
  metric,
  index,
  forceDark
}: {
  metric: SecondaryMetric;
  index: number;
  forceDark?: boolean;
}) {
  const themeDark = useAppDarkMode();
  const dark = forceDark ?? themeDark;
  const accent = metric.color ?? "#7c3aed";
  const iconShell = metricKpiIconShell(accent, dark);

  return (
    <div
      className={cn(
        "dashboard-kpi-card dashboard-kpi-card--period kpi-card-hover animate-fade-up flex min-w-0 flex-col",
        !dark && "dashboard-kpi-card--light"
      )}
      style={{
        animationDelay: `${index * 50}ms`,
        animationFillMode: "both"
      }}
    >
      <div className="mb-1.5 flex items-start justify-between gap-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {metric.key ? (
            <div
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
              style={iconShell}
            >
              <MetricKpiIcon metricKey={metric.key} color={accent} size={11} />
            </div>
          ) : null}
          <span
            className="truncate text-[9px] font-semibold uppercase tracking-wide"
            style={{ color: dark ? "#94a3b8" : "var(--text-dimmer)" }}
          >
            {metric.label}
          </span>
        </div>
        <TrendBadge change={metric.change} trend={metric.trend} small dark={dark} />
      </div>

      <div
        className="truncate font-heading text-[15px] font-bold leading-tight tabular-nums tracking-tight"
        style={{ color: "var(--text-main)", fontFamily: "var(--font-heading)" }}
      >
        {metric.value}
      </div>

      {metric.subLabel ? (
        <p
          className="mt-0.5 truncate text-[8px] leading-snug"
          style={{ color: dark ? "#64748b" : "var(--text-dimmer)" }}
        >
          {metric.subLabel}
        </p>
      ) : null}
    </div>
  );
}

function PeriodMetricGrid({
  metrics,
  isLoading,
  forceDark
}: {
  metrics: SecondaryMetric[];
  isLoading?: boolean;
  forceDark?: boolean;
}) {
  if (isLoading) {
    return (
      <div className={KPI_GRID_CLASS}>
        {Array.from({ length: 5 }, (_, i) => i + 1).map((i) => (
          <div key={i} className="dashboard-kpi-card dashboard-kpi-card--period">
            <div className="mb-1.5 flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <div className="skeleton-shimmer h-5 w-5 rounded-md" />
                <div className="skeleton-shimmer h-2.5 w-14 rounded" />
              </div>
              <div className="skeleton-shimmer h-4 w-12 rounded-full" />
            </div>
            <div className="skeleton-shimmer h-5 w-20 rounded" />
            <div className="skeleton-shimmer mt-1 h-2 w-16 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={KPI_GRID_CLASS}>
      {metrics.map((metric, index) => (
        <PeriodMetricTile
          key={metric.key ?? metric.label}
          metric={metric}
          index={index}
          forceDark={forceDark}
        />
      ))}
    </div>
  );
}

function PrimaryKpiGrid({
  primaryKPIs,
  isLoading,
  forceDark,
  skeletonCount = 10
}: {
  primaryKPIs: KpiCard[];
  isLoading?: boolean;
  forceDark?: boolean;
  skeletonCount?: number;
}) {
  if (isLoading) {
    return (
      <div className={KPI_GRID_CLASS}>
        {Array.from({ length: skeletonCount }, (_, i) => i + 1).map((i) => (
          <div key={i} className="dashboard-kpi-card">
            <div className="mb-1.5 flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <div className="skeleton-shimmer h-6 w-6 rounded-md" />
                <div className="skeleton-shimmer h-2.5 w-14 rounded" />
              </div>
              <div className="skeleton-shimmer h-4 w-12 rounded-full" />
            </div>
            <div className="skeleton-shimmer mb-1 h-5 w-20 rounded" />
            <div className="skeleton-shimmer mb-1.5 h-2 w-16 rounded" />
            <div className="skeleton-shimmer dashboard-kpi-card__spark w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={KPI_GRID_CLASS}>
      {primaryKPIs.map((kpi, index) => (
        <KpiCardTile key={kpi.metricKey ?? kpi.label} kpi={kpi} index={index} forceDark={forceDark} />
      ))}
    </div>
  );
}

export function MetricPrismPrimary({
  primaryKPIs,
  isLoading,
  forceDark
}: {
  primaryKPIs: KpiCard[];
  isLoading?: boolean;
  forceDark?: boolean;
}) {
  return (
    <div className="w-full">
      <PrimaryKpiGrid primaryKPIs={primaryKPIs} isLoading={isLoading} forceDark={forceDark} />
    </div>
  );
}

export function MetricKpiCard({ kpi, isLoading }: { kpi: KpiCard; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <div className="dashboard-kpi-card">
        <div className="mb-2 flex items-center gap-2">
          <div className="skeleton-shimmer h-7 w-7 rounded-lg" />
          <div className="skeleton-shimmer h-2.5 w-16 rounded" />
        </div>
        <div className="skeleton-shimmer mb-1.5 h-6 w-24 rounded" />
        <div className="skeleton-shimmer mb-2 h-2 w-20 rounded" />
        <div className="skeleton-shimmer dashboard-kpi-card__spark w-full" />
      </div>
    );
  }
  return <KpiCardTile kpi={kpi} index={0} />;
}

export function MetricPrism({
  primaryKPIs,
  secondaryMetrics,
  secondaryTitle,
  isLoading,
  forceDark
}: {
  primaryKPIs: KpiCard[];
  /** Period metrics row — compact cards without sparklines. */
  secondaryMetrics: SecondaryMetric[];
  secondaryTitle?: string;
  /** Show loading skeleton only while fetching — not for empty accounts. */
  isLoading?: boolean;
  /** Force dark KPI styling (e.g. marketing showcase on a dark panel). */
  forceDark?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <PrimaryKpiGrid primaryKPIs={[]} isLoading skeletonCount={10} forceDark={forceDark} />
        <PeriodMetricGrid metrics={[]} isLoading forceDark={forceDark} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PrimaryKpiGrid primaryKPIs={primaryKPIs} forceDark={forceDark} />

      {secondaryMetrics.length > 0 ? (
        <div className="space-y-2.5 pb-1">
          {secondaryTitle ? (
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
              {secondaryTitle}
            </p>
          ) : null}
          <PeriodMetricGrid metrics={secondaryMetrics} forceDark={forceDark} />
        </div>
      ) : null}
    </div>
  );
}
