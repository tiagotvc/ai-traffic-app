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
      className="flex shrink-0 items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium"
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

/** Metric row that stretches to fill the grid cell width. */
export function CanvasMetricStrip({
  items,
  isLoading,
  visual
}: {
  items: CanvasMetricItem[];
  isLoading?: boolean;
  visual?: SlotVisualConfig;
}) {
  if (isLoading) {
    return (
      <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton-shimmer min-h-[4.5rem] rounded-lg" />
        ))}
      </div>
    );
  }

  if (!items.length) return null;

  const cols = Math.min(Math.max(items.length, 1), 6);
  const fontFamily = visual?.fontFamily ? FONT_FAMILY_CSS[visual.fontFamily] : undefined;
  const fontSize = visual?.fontSize ? FONT_SIZE_CSS[visual.fontSize].value : undefined;
  const textColor = visual?.textColor;
  const accentColor = visual?.accentColor;

  return (
    <div
      className={cn(
        "grid w-full gap-2.5 max-lg:h-auto max-lg:min-h-0 lg:h-full",
        cols === 1 && "grid-cols-1",
        cols === 2 && "grid-cols-1 sm:grid-cols-2",
        cols >= 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      )}
    >
      {items.map((m) => (
        <div
          key={m.label}
          className="flex min-h-[4.5rem] min-w-0 flex-col justify-center rounded-lg px-3 py-2.5 sm:min-h-[3rem] sm:px-2.5 sm:py-1.5"
          style={{
            background: "var(--surface-bg)",
            border: "1px solid var(--border-color)"
          }}
        >
          <span
            className="truncate text-[11px] leading-snug sm:text-[10px] sm:leading-tight"
            style={{ color: textColor ?? "var(--text-dimmer)", fontFamily, fontSize }}
          >
            {m.label}
          </span>
          <div className="mt-1 flex min-w-0 items-center justify-between gap-2 sm:mt-0.5 sm:gap-1">
            <span
              className="truncate text-base font-semibold leading-snug sm:text-sm sm:leading-tight"
              style={{
                color: accentColor ?? textColor ?? "var(--text-main)",
                fontFamily: fontFamily ?? "var(--font-heading)",
                fontSize: fontSize ?? undefined
              }}
            >
              {m.value}
            </span>
            <TrendBadge change={m.change} trend={m.trend} />
          </div>
        </div>
      ))}
    </div>
  );
}
