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
        "kpi-card-hover kpi-card-premium animate-fade-up flex h-full min-w-0 flex-col overflow-hidden rounded-2xl p-4 max-lg:h-auto max-lg:min-h-0 max-lg:py-3 sm:p-5 lg:min-h-0",
        !dark && "kpi-card-premium--light"
      )}
      style={{
        ...shell,
        animationDelay: `${index * 80}ms`,
        animationFillMode: "both"
      }}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={iconShell}
          >
            <MetricKpiIcon metricKey={kpi.metricKey} color={kpi.color} size={16} />
          </div>
          <span
            className="truncate text-[11px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: dark ? "#94a3b8" : "#64748b" }}
          >
            {kpi.label}
          </span>
        </div>
        <TrendBadge change={kpi.change} trend={kpi.trend} dark={dark} />
      </div>

      <div
        className="mb-1 truncate font-bold leading-none tabular-nums tracking-tight"
        style={{
          fontSize: "clamp(1.35rem, 2.6vw, 2.05rem)",
          color: kpi.color,
          fontFamily: "var(--font-heading)",
          textShadow: dark ? `0 0 24px ${kpi.color}55` : undefined
        }}
      >
        {kpi.value}
      </div>

      <p className="mb-2 truncate text-[11px]" style={{ color: dark ? "#64748b" : "#94a3b8" }}>
        {kpi.subLabel}
      </p>

      <div
        className="mt-auto h-[96px] min-h-[96px] w-full shrink-0 overflow-hidden rounded-xl"
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
      <div className="grid h-full grid-cols-1 gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border p-4"
            style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
          >
            <div className="mb-4 flex items-center gap-2.5">
              <div className="skeleton-shimmer h-9 w-9 rounded-full" />
              <div className="skeleton-shimmer h-3 w-20 rounded" />
            </div>
            <div className="skeleton-shimmer mb-2 h-10 w-32 rounded" />
            <div className="skeleton-shimmer mb-3 h-2.5 w-28 rounded" />
            <div className="skeleton-shimmer h-[96px] w-full rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  const cols = Math.min(Math.max(primaryKPIs.length, 1), 3);

  return (
    <div
      className={cn(
        "grid w-full gap-3 max-lg:auto-rows-min max-lg:gap-4 max-lg:h-auto lg:h-full",
        cols === 1 && "grid-cols-1",
        cols === 2 && "grid-cols-1 sm:grid-cols-2",
        cols >= 3 && "grid-cols-1 sm:grid-cols-3"
      )}
    >
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
    <div className="h-full min-h-0 w-full max-lg:h-auto">
      <PrimaryKpiGrid primaryKPIs={primaryKPIs} isLoading={isLoading} forceDark={forceDark} />
    </div>
  );
}

export function MetricKpiCard({ kpi, isLoading }: { kpi: KpiCard; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <div
        className="h-full rounded-2xl border p-4"
        style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
      >
        <div className="mb-4 flex items-center gap-2.5">
          <div className="skeleton-shimmer h-9 w-9 rounded-full" />
          <div className="skeleton-shimmer h-3 w-20 rounded" />
        </div>
        <div className="skeleton-shimmer mb-2 h-10 w-32 rounded" />
        <div className="skeleton-shimmer mb-3 h-2.5 w-28 rounded" />
        <div className="skeleton-shimmer h-[64px] w-full rounded-xl" />
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
      <div className="space-y-3">
        <PrimaryKpiGrid primaryKPIs={[]} isLoading forceDark={forceDark} />
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
      <PrimaryKpiGrid primaryKPIs={primaryKPIs} forceDark={forceDark} />

      {secondaryMetrics.length > 0 ? (
        <div className="space-y-2">
          {secondaryTitle ? (
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-dimmer)" }}>
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
