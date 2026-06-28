"use client";

import { SparklineChart } from "@/components/dashboard/SparklineChart";
import { MetricKpiIcon } from "@/components/dashboard/MetricKpiIcon";
import { CanvasMetricStrip, type CanvasMetricItem } from "@/components/dashboard/canvas/widgets/CanvasMetricStrip";
import { useAppDarkMode } from "@/hooks/useAppDarkMode";
import { cn } from "@/lib/cn";
import {
  metricKpiCardShell,
  metricKpiChartFrame,
  metricKpiIconShell,
  metricKpiTrendColors
} from "@/lib/dashboard/metric-kpi-theme";
import { METRIC_BY_KEY, type MetricKey } from "@/lib/dashboard-metrics";

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
};

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
  const isUp = trend === "up";
  const isNeutral = trend === "neutral";
  const { color, background } = metricKpiTrendColors(trend, dark);

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
      {change}
    </span>
  );
}

/** Responsive hero KPI grid: 2 cols mobile → 3 tablet → 5 desktop. */
const HERO_KPI_GRID_CLASS = "grid w-full grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5";

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
  const shell = metricKpiCardShell(kpi.color, dark);
  const iconShell = metricKpiIconShell(kpi.color, dark);
  const chartFrame = metricKpiChartFrame(kpi.color, dark);

  return (
    <div
      className={cn(
        "dashboard-kpi-card kpi-card-hover animate-fade-up flex min-w-0 flex-col",
        !dark && "dashboard-kpi-card--light"
      )}
      style={{
        ...shell,
        animationDelay: `${index * 60}ms`,
        animationFillMode: "both"
      }}
    >
      <div className="mb-1 flex items-start justify-between gap-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
            style={iconShell}
          >
            <MetricKpiIcon metricKey={kpi.metricKey} color={kpi.color} size={12} />
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
        className="truncate font-heading text-base font-bold leading-tight tabular-nums tracking-tight"
        style={{
          color: dark ? "var(--text-main)" : "var(--text-main)",
          fontFamily: "var(--font-heading)"
        }}
      >
        {kpi.value}
      </div>

      <p
        className="mb-1 truncate text-[9px]"
        style={{ color: dark ? "#64748b" : "var(--text-dimmer)" }}
      >
        {kpi.subLabel}
      </p>

      <div
        className="dashboard-kpi-card__spark mt-auto w-full shrink-0"
        style={chartFrame}
      >
        <SparklineChart
          data={kpi.sparkData}
          labels={kpi.sparkLabels}
          color={kpi.color}
          formatValue={kpi.formatSparkValue}
          variant="premium"
          dark={dark}
        />
      </div>
    </div>
  );
}

function PrimaryKpiGrid({
  primaryKPIs,
  isLoading,
  forceDark
}: {
  primaryKPIs: KpiCard[];
  isLoading?: boolean;
  forceDark?: boolean;
}) {
  if (isLoading) {
    return (
      <div className={HERO_KPI_GRID_CLASS}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="dashboard-kpi-card">
            <div className="mb-1.5 flex items-center gap-1.5">
              <div className="skeleton-shimmer h-6 w-6 rounded-md" />
              <div className="skeleton-shimmer h-2.5 w-14 rounded" />
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
    <div className={HERO_KPI_GRID_CLASS}>
      {primaryKPIs.map((kpi, index) => (
        <KpiCardTile key={kpi.label} kpi={kpi} index={index} forceDark={forceDark} />
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
        <PrimaryKpiGrid primaryKPIs={[]} isLoading forceDark={forceDark} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="skeleton-shimmer h-8 rounded-lg" />
          ))}
        </div>
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
          <CanvasMetricStrip
            items={secondaryMetrics.map(
              (m): CanvasMetricItem => ({
                label: m.label,
                value: m.value,
                change: m.change,
                trend: m.trend,
                color: m.key ? METRIC_BY_KEY[m.key]?.color : undefined
              })
            )}
          />
        </div>
      ) : null}
    </div>
  );
}
