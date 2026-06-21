"use client";

import { cn } from "@/lib/cn";

export type CanvasMetricItem = {
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
        "flex shrink-0 items-center gap-0.5 rounded font-medium",
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

/** Compact metric row for grid widgets — no internal scroll. */
export function CanvasMetricStrip({
  items,
  isLoading
}: {
  items: CanvasMetricItem[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex h-full flex-wrap items-center gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton-shimmer h-9 w-28 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-wrap items-center gap-2">
      {items.map((m) => (
        <div
          key={m.label}
          className="flex min-w-0 items-center gap-2 rounded-xl px-3 py-2"
          style={{
            background: "var(--surface-bg)",
            border: "1px solid var(--border-color)"
          }}
        >
          <span className="truncate text-xs" style={{ color: "var(--text-dimmer)" }}>
            {m.label}
          </span>
          <span
            className="shrink-0 text-sm font-semibold"
            style={{ color: "var(--text-main)", fontFamily: "var(--font-heading)" }}
          >
            {m.value}
          </span>
          <TrendBadge change={m.change} trend={m.trend} small />
        </div>
      ))}
    </div>
  );
}
