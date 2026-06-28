export function metricKpiCardShell(_color: string, dark: boolean) {
  if (dark) {
    return {
      background: "rgba(15, 23, 42, 0.82)",
      border: "1px solid rgba(148, 163, 184, 0.18)",
      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.2)"
    } as const;
  }

  return {
    background: "var(--creator-card-bg, var(--surface-card))",
    border: "1px solid var(--creator-card-border, var(--border-color))",
    boxShadow: "none"
  } as const;
}

export function metricKpiIconShell(color: string, dark: boolean) {
  if (dark) {
    return {
      background: `${color}20`,
      border: `1px solid ${color}55`,
      boxShadow: `0 0 16px ${color}45`
    } as const;
  }

  return {
    background: `${color}14`,
    border: `1px solid ${color}22`,
    boxShadow: "none"
  } as const;
}

export function metricKpiChartFrame(_color: string, dark: boolean) {
  if (dark) {
    return {
      background: "rgba(15, 23, 42, 0.45)",
      border: "1px solid rgba(148, 163, 184, 0.12)"
    } as const;
  }

  return {
    background: "var(--creator-card-bg-inset, var(--surface-bg))",
    border: "1px solid var(--creator-card-border, var(--border-color))"
  } as const;
}

export function metricKpiTrendColors(trend: "up" | "down" | "neutral", dark: boolean) {
  if (trend === "neutral") {
    return {
      color: dark ? "#94a3b8" : "#64748b",
      background: dark ? "rgba(148, 163, 184, 0.14)" : "rgba(100, 116, 139, 0.1)"
    };
  }

  if (trend === "up") {
    return {
      color: dark ? "#34d399" : "#059669",
      background: dark ? "rgba(52, 211, 153, 0.16)" : "rgba(16, 185, 129, 0.12)"
    };
  }

  return {
    color: dark ? "#f87171" : "#dc2626",
    background: dark ? "rgba(248, 113, 113, 0.16)" : "rgba(239, 68, 68, 0.1)"
  };
}

export function formatSparkAxisValue(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}
