"use client";

import type { ReactNode } from "react";
import {
  AlertTriangle,
  Brain,
  Gauge,
  Lightbulb,
  Target,
  TrendingUp,
  Zap,
  type LucideIcon
} from "lucide-react";

import { cn } from "@/lib/cn";
import type { AlertDisplaySize, AlertIconKey, AlertVisualConfig } from "@/lib/dashboard/alert-widget-config";
import { resolveAlertThemeTokens } from "@/lib/dashboard/alert-widget-config";

const ICONS: Record<AlertIconKey, LucideIcon> = {
  brain: Brain,
  alert: AlertTriangle,
  target: Target,
  zap: Zap,
  trend: TrendingUp,
  lightbulb: Lightbulb,
  gauge: Gauge
};

export function AlertCardShell({
  visual,
  icon,
  categoryLabel,
  action,
  body,
  chart,
  layout,
  displaySize = "full",
  className
}: {
  visual: AlertVisualConfig;
  icon?: AlertIconKey;
  categoryLabel?: string;
  action?: ReactNode;
  body: ReactNode;
  chart?: ReactNode;
  layout: "horizontal" | "vertical";
  displaySize?: AlertDisplaySize;
  className?: string;
}) {
  const tokens = resolveAlertThemeTokens(visual);
  const Icon = ICONS[icon ?? visual.icon ?? "alert"];
  const isHorizontal = layout === "horizontal" && displaySize === "full";
  const isMinimal = displaySize === "minimal";

  return (
    <div
      className={cn(
        "alert-card-root flex h-full min-h-0 w-full overflow-hidden rounded-2xl border shadow-sm",
        isHorizontal ? "flex-row gap-3 p-3 sm:gap-4 sm:p-4" : "flex-col gap-2 p-3 sm:gap-3 sm:p-4",
        isMinimal && "gap-2 p-2.5",
        className
      )}
      style={{
        background: tokens.cardBg,
        borderColor: tokens.border,
        color: tokens.text,
        boxShadow: tokens.isDark ? "0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)" : undefined
      }}
    >
      <div className={cn("flex min-w-0 flex-col", isHorizontal ? "w-[44%] shrink-0" : "flex-1")}>
        <div className={cn("flex items-start justify-between gap-2", isMinimal ? "mb-1.5" : "mb-2 sm:mb-3")}>
          <div className="flex min-w-0 items-start gap-2 sm:gap-3">
            <div
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full",
                isMinimal ? "h-8 w-8" : "h-9 w-9 sm:h-10 sm:w-10"
              )}
              style={{
                background: tokens.iconBg,
                boxShadow: tokens.isDark ? `0 0 18px ${tokens.accent}55` : undefined
              }}
            >
              <Icon size={isMinimal ? 15 : 17} style={{ color: tokens.accent }} />
            </div>
            {categoryLabel ? (
              <p
                className={cn(
                  "pt-1.5 font-bold uppercase tracking-wider sm:pt-2",
                  isMinimal ? "text-[9px]" : "text-[10px]"
                )}
                style={{ color: tokens.accent }}
              >
                {categoryLabel}
              </p>
            ) : null}
          </div>
          {action}
        </div>
        {body}
      </div>
      {chart ? (
        <div
          className={cn(
            "min-h-0 min-w-0",
            isHorizontal ? "flex flex-1 flex-col justify-center" : "shrink-0"
          )}
        >
          {chart}
        </div>
      ) : null}
    </div>
  );
}

export function AlertBadge({
  label,
  tone,
  accent,
  dark
}: {
  label: string;
  tone?: "critical" | "warning" | "success" | "info";
  accent: string;
  dark?: boolean;
}) {
  const colors = {
    critical: { bg: "rgba(239,68,68,0.15)", text: "#ef4444" },
    warning: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b" },
    success: { bg: "rgba(34,197,94,0.15)", text: "#22c55e" },
    info: { bg: `${accent}22`, text: accent }
  };
  const c = colors[tone ?? "info"];
  return (
    <span
      className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: dark ? c.bg : c.bg, color: c.text }}
    >
      {label}
    </span>
  );
}

export function AlertDelta({
  label,
  trend,
  accent
}: {
  label?: string;
  trend?: "up" | "down" | "neutral";
  accent: string;
}) {
  if (!label) return null;
  const color = trend === "up" ? "#22c55e" : trend === "down" ? "#ef4444" : accent;
  return (
    <span className="text-xs font-semibold" style={{ color }}>
      {trend === "up" ? "↑ " : trend === "down" ? "↓ " : ""}
      {label}
    </span>
  );
}

export function useAlertTheme(visual: AlertVisualConfig) {
  return resolveAlertThemeTokens(visual);
}

export function chartHeightForSize(
  displaySize: AlertDisplaySize,
  layout: "horizontal" | "vertical"
): number {
  if (displaySize === "minimal") return 0;
  if (displaySize === "compact") return layout === "horizontal" ? 72 : 64;
  return layout === "horizontal" ? 132 : 96;
}
