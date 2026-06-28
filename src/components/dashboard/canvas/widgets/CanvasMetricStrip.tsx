"use client";

import { cn } from "@/lib/cn";
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
};

function TrendBadge({
  change,
  trend
}: {
  change: string;
  trend: "up" | "down" | "neutral";
}) {
  const isUp = trend === "up";
  const isNeutral = trend === "neutral";
  const color = isNeutral ? "#94a3b8" : isUp ? "#10b981" : "#ef4444";

  return (
    <span
      className="flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
      style={{ background: `${color}15`, color }}
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
      {change}
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
  const fontFamily = visual?.fontFamily ? FONT_FAMILY_CSS[visual.fontFamily] : undefined;
  const fontSize = visual?.fontSize ? FONT_SIZE_CSS[visual.fontSize].value : undefined;
  const textColor = visual?.textColor;
  const accentColor = visual?.accentColor;

  return (
    <div
      className={cn(
        "dashboard-metric-chip kpi-card-hover flex min-w-0 items-center gap-1.5 px-2.5 py-1.5",
        fillCell && "h-full w-full"
      )}
    >
      {item.color ? (
        <span className="h-1 w-1 shrink-0 rounded-full" style={{ background: item.color }} />
      ) : null}
      <span
        className="shrink-0 text-[10px] font-medium uppercase tracking-wide"
        style={{ color: textColor ?? "var(--text-dimmer)", fontFamily, fontSize }}
      >
        {item.label}
      </span>
      <span
        className="min-w-0 flex-1 truncate text-xs font-semibold tabular-nums"
        title={item.value}
        style={{
          color: accentColor ?? textColor ?? "var(--text-main)",
          fontFamily: fontFamily ?? "var(--font-heading)"
        }}
      >
        {item.value}
      </span>
      <TrendBadge change={item.change} trend={item.trend} />
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
      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="skeleton-shimmer h-8 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!items.length) return null;

  const cols = Math.min(Math.max(items.length, 1), 8);
  // Até 8 por linha no desktop; quebra progressivamente em telas menores.
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
        "grid w-full",
        cellFill ? "dashboard-metric-strip--cell h-full grid-cols-1 grid-rows-1 gap-0" : "auto-rows-min gap-3",
        !cellFill && colClass
      )}
    >
      {items.map((m) => (
        <CompactMetricCard key={m.label} item={m} visual={visual} fillCell={cellFill} />
      ))}
    </div>
  );
}
