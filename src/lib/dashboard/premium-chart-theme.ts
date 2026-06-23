import type { CSSProperties } from "react";

/** Visual tokens aligned with landing marketing charts (StackCostComparison). */

export const PREMIUM_CHART_MARGIN = { top: 8, right: 12, left: 0, bottom: 4 } as const;

export function premiumGridProps(vertical = false) {
  return {
    strokeDasharray: "3 3",
    stroke: "var(--chart-grid)",
    vertical
  };
}

export function premiumAxisTick(override?: string) {
  return {
    fill: override ?? "var(--chart-tick)",
    fontSize: 10
  };
}

export const premiumTooltipContentStyle: CSSProperties = {
  background: "var(--chart-tooltip-bg)",
  border: "1px solid var(--chart-tooltip-border)",
  borderRadius: 12,
  fontSize: 12,
  boxShadow: "var(--chart-tooltip-shadow)",
  color: "var(--text-main)"
};

export const premiumTooltipCursor = { fill: "var(--chart-cursor)" };

export const PREMIUM_BAR_RADIUS = {
  vertical: [6, 6, 0, 0] as [number, number, number, number],
  horizontal: [0, 6, 6, 0] as [number, number, number, number]
};

export function premiumAreaGradientStops(color: string) {
  return [
    { offset: "0%", stopColor: color, stopOpacity: 0.45 },
    { offset: "55%", stopColor: color, stopOpacity: 0.14 },
    { offset: "100%", stopColor: color, stopOpacity: 0.02 }
  ];
}

export const premiumRechartsTooltipProps = {
  cursor: premiumTooltipCursor,
  contentStyle: premiumTooltipContentStyle
} as const;

export function axisTickColor(override?: string) {
  return override ?? "var(--chart-tick)";
}

export function premiumActiveDot(color: string) {
  return {
    r: 5,
    fill: color,
    stroke: "var(--chart-active-dot-ring)",
    strokeWidth: 2
  };
}
