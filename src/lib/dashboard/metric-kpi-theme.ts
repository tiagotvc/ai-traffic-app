export function metricKpiCardShell(color: string, dark: boolean) {
  if (dark) {
    return {
      background: `linear-gradient(155deg, ${color}16 0%, rgba(15, 23, 42, 0.78) 42%, rgba(8, 12, 24, 0.92) 100%)`,
      border: `1px solid ${color}55`,
      borderTop: `3px solid ${color}`,
      boxShadow: `0 0 0 1px ${color}20, 0 10px 36px ${color}1a, inset 0 1px 0 ${color}22`,
      backdropFilter: "blur(14px)"
    } as const;
  }

  return {
    background: "var(--surface-card)",
    border: "1px solid var(--border-color)",
    borderTop: `3px solid ${color}`,
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05), 0 6px 18px rgba(15, 23, 42, 0.04)"
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

export function metricKpiChartFrame(color: string, dark: boolean) {
  if (dark) {
    return {
      background: "rgba(15, 23, 42, 0.35)",
      border: `1px solid ${color}18`
    } as const;
  }

  return {
    background: "rgba(248, 250, 252, 0.95)",
    border: "1px solid rgba(226, 232, 240, 0.9)"
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
