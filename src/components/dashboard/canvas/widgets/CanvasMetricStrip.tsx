"use client";

import { useTranslations } from "next-intl";

import { MetricKpiIcon } from "@/components/dashboard/MetricKpiIcon";
import { useAppDarkMode } from "@/hooks/useAppDarkMode";
import { cn } from "@/lib/cn";
import {
  metricKpiCardShell,
  metricKpiIconShell,
  metricKpiTrendColors
} from "@/lib/dashboard/metric-kpi-theme";
import { METRIC_BY_KEY, type MetricKey } from "@/lib/dashboard-metrics";
import {
  FONT_FAMILY_CSS,
  FONT_SIZE_CSS,
  type SlotVisualConfig
} from "@/lib/dashboard/slot-visual-config";

export type CanvasMetricItem = {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
  color?: string;
  metricKey?: MetricKey;
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
  dark = false
}: {
  change: string;
  trend: "up" | "down" | "neutral";
  dark?: boolean;
}) {
  const tDash = useTranslations("dashboard");
  const isUp = trend === "up";
  const isNeutral = trend === "neutral";
  const { color, background } = metricKpiTrendColors(trend, dark);
  const displayChange = resolveDeltaChangeLabel(change, tDash);

  return (
    <span
      className="flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums"
      style={{ background, color }}
    >
      {!isNeutral ? (
        <svg className="h-2 w-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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

function CompactMetricCard({
  item,
  visual,
  fillCell = false
}: {
  item: CanvasMetricItem;
  visual?: SlotVisualConfig;
  fillCell?: boolean;
}) {
  const themeDark = useAppDarkMode();
  const color = item.color ?? (item.metricKey ? METRIC_BY_KEY[item.metricKey].color : "#64748b");
  const shell = metricKpiCardShell(color, themeDark);
  const iconShell = metricKpiIconShell(color, themeDark);
  const fontFamily = visual?.fontFamily ? FONT_FAMILY_CSS[visual.fontFamily] : undefined;
  const fontSize = visual?.fontSize ? FONT_SIZE_CSS[visual.fontSize].value : undefined;
  const textColor = visual?.textColor;
  const accentColor = visual?.accentColor;

  return (
    <div
      className={cn(
        "dashboard-kpi-card dashboard-kpi-card--mini kpi-card-hover flex min-w-0 flex-row items-center gap-2",
        !themeDark && "dashboard-kpi-card--light",
        fillCell && "h-full w-full"
      )}
      style={shell}
    >
      <div
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
        style={iconShell}
      >
        <MetricKpiIcon metricKey={item.metricKey} color={color} size={10} />
      </div>
      <span
        className="min-w-0 shrink truncate text-[9px] font-semibold uppercase tracking-wide"
        style={{ color: textColor ?? "var(--text-dimmer)", fontFamily, fontSize }}
      >
        {item.label}
      </span>
      <span
        className="ml-auto min-w-0 truncate font-heading text-sm font-bold leading-none tabular-nums tracking-tight"
        title={item.value}
        style={{
          color: accentColor ?? textColor ?? "var(--text-main)",
          fontFamily: fontFamily ?? "var(--font-heading)"
        }}
      >
        {item.value}
      </span>
      <TrendBadge change={item.change} trend={item.trend} dark={themeDark} />
    </div>
  );
}

/** Compact metric cards in a responsive grid (quick metrics / secondary KPIs). */
export function CanvasMetricStrip({
  items,
  isLoading,
  visual,
  cellFill = false
}: {
  items: CanvasMetricItem[];
  isLoading?: boolean;
  visual?: SlotVisualConfig;
  /** Single KPI in a grid cell — stretch to fill the cell. */
  cellFill?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="dashboard-kpi-card dashboard-kpi-card--mini flex flex-row items-center gap-2 p-1.5"
          >
            <div className="skeleton-shimmer h-5 w-5 shrink-0 rounded-md" />
            <div className="skeleton-shimmer h-2 w-12 shrink rounded" />
            <div className="skeleton-shimmer ml-auto h-4 w-14 shrink-0 rounded" />
            <div className="skeleton-shimmer h-4 w-10 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) return null;

  const cols = Math.min(Math.max(items.length, 1), 8);
  const colClass =
    cols === 1
      ? "grid-cols-1"
      : cols === 2
        ? "grid-cols-2"
        : cols === 3
          ? "grid-cols-2 sm:grid-cols-3"
          : cols === 4
            ? "grid-cols-2 sm:grid-cols-4"
            : cols === 5
              ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
              : cols === 6
                ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
                : cols === 7
                  ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-7"
                  : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-8";

  return (
    <div
      className={cn(
        "grid w-full gap-2.5",
        cellFill ? "dashboard-metric-strip--cell h-full grid-cols-1 grid-rows-1 gap-0" : "auto-rows-min",
        !cellFill && colClass
      )}
    >
      {items.map((m) => (
        <CompactMetricCard key={m.label} item={m} visual={visual} fillCell={cellFill} />
      ))}
    </div>
  );
}
