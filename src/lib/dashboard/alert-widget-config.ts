import type { AlertType } from "@/db/entities/Alert";
import type { MetricKey } from "@/lib/dashboard-metrics";

export type AlertSourceKind =
  | "learning"
  | "goal"
  | "variation"
  | "automation"
  | "learning_phase";

export type AlertTemplate = "metric_threshold" | "brain_insight" | "brain_progress" | "compact";
export type AlertTheme = "auto" | "premium" | "clean" | "minimal" | "custom";
export type AlertLayout = "horizontal" | "vertical" | "auto";
export type AlertIconKey = "brain" | "alert" | "target" | "zap" | "trend" | "lightbulb" | "gauge";

export type AlertSource =
  | { kind: "learning"; learningId?: "latest" | string }
  | { kind: "goal"; alertType: AlertType }
  | { kind: "variation"; metricKey: MetricKey }
  | { kind: "automation"; ruleId: string }
  | { kind: "learning_phase" };

export type AlertVisualConfig = {
  theme: AlertTheme;
  accentColor?: string;
  iconBgColor?: string;
  cardBgColor?: string;
  icon?: AlertIconKey;
  layout?: AlertLayout;
};

export type AlertWidgetConfig = {
  source: AlertSource;
  template: AlertTemplate;
  visual: AlertVisualConfig;
};

export type AlertCardDataPoint = { date: string; value: number; label?: string };

export type AlertCardPayload = {
  categoryLabel: string;
  headline: string;
  description?: string;
  metricLabel?: string;
  metricValue?: string;
  deltaLabel?: string;
  deltaTrend?: "up" | "down" | "neutral";
  badgeLabel?: string;
  badgeTone?: "critical" | "warning" | "success" | "info";
  thresholdLabel?: string;
  thresholdValue?: number;
  impactLabel?: string;
  confidenceLabel?: string;
  progressPercent?: number;
  progressHint?: string;
  series?: AlertCardDataPoint[];
  comparisonSeries?: AlertCardDataPoint[];
  comparisonLabel?: string;
  status?: "monitoring" | "triggered" | "ok";
  actionHref?: string;
  actionLabel?: string;
};

export const GOAL_ALERT_TYPES: AlertType[] = [
  "CTR_BELOW_MIN",
  "ROAS_BELOW_MIN",
  "CPL_ABOVE_MAX",
  "CPA_ABOVE_MAX",
  "BUDGET_NEAR_LIMIT",
  "SPEND_NO_CONVERSION",
  "CONVERSION_DROP"
];

export const ALERT_THEME_PRESETS: Record<
  Exclude<AlertTheme, "custom">,
  { accent: string; iconBg: string; cardBg: string; text: string; textDim: string; border: string }
> = {
  premium: {
    accent: "#a855f7",
    iconBg: "rgba(168,85,247,0.2)",
    cardBg: "#0f1117",
    text: "#f8fafc",
    textDim: "#94a3b8",
    border: "rgba(168,85,247,0.25)"
  },
  clean: {
    accent: "#3b82f6",
    iconBg: "rgba(59,130,246,0.12)",
    cardBg: "#ffffff",
    text: "#0f172a",
    textDim: "#64748b",
    border: "rgba(59,130,246,0.2)"
  },
  minimal: {
    accent: "#22c55e",
    iconBg: "rgba(34,197,94,0.12)",
    cardBg: "#ffffff",
    text: "#0f172a",
    textDim: "#64748b",
    border: "rgba(34,197,94,0.18)"
  }
};

export const DEFAULT_ALERT_WIDGET_CONFIG: AlertWidgetConfig = {
  source: { kind: "goal", alertType: "ROAS_BELOW_MIN" },
  template: "metric_threshold",
  visual: { theme: "auto", icon: "alert", layout: "auto" }
};

export function resolveAlertThemeForApp(
  visual: AlertVisualConfig,
  appDark: boolean
): AlertVisualConfig {
  if (visual.theme === "auto") {
    return { ...visual, theme: appDark ? "premium" : "clean" };
  }
  if (visual.theme === "clean" && appDark) {
    return { ...visual, theme: "premium" };
  }
  return visual;
}

export function parseAlertWidgetConfig(raw: Record<string, unknown>): AlertWidgetConfig {
  const source = parseAlertSource(raw.source);
  const template = parseAlertTemplate(raw.template);
  const visual = parseAlertVisualConfig(raw.visual);
  return { source, template, visual };
}

function parseAlertSource(raw: unknown): AlertSource {
  if (!raw || typeof raw !== "object") return DEFAULT_ALERT_WIDGET_CONFIG.source;
  const o = raw as Record<string, unknown>;
  const kind = o.kind as AlertSourceKind | undefined;
  if (kind === "learning") {
    const learningId =
      o.learningId === "latest" || typeof o.learningId === "string" ? o.learningId : "latest";
    return { kind: "learning", learningId };
  }
  if (kind === "goal" && typeof o.alertType === "string") {
    return { kind: "goal", alertType: o.alertType as AlertType };
  }
  if (kind === "variation" && typeof o.metricKey === "string") {
    return { kind: "variation", metricKey: o.metricKey as MetricKey };
  }
  if (kind === "automation" && typeof o.ruleId === "string") {
    return { kind: "automation", ruleId: o.ruleId };
  }
  if (kind === "learning_phase") return { kind: "learning_phase" };
  return DEFAULT_ALERT_WIDGET_CONFIG.source;
}

function parseAlertTemplate(raw: unknown): AlertTemplate {
  const allowed: AlertTemplate[] = ["metric_threshold", "brain_insight", "brain_progress", "compact"];
  return allowed.includes(raw as AlertTemplate) ? (raw as AlertTemplate) : "metric_threshold";
}

export function parseAlertVisualConfig(raw: unknown): AlertVisualConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_ALERT_WIDGET_CONFIG.visual;
  const o = raw as Record<string, unknown>;
  const theme = (["auto", "premium", "clean", "minimal", "custom"] as AlertTheme[]).includes(
    o.theme as AlertTheme
  )
    ? (o.theme as AlertTheme)
    : "auto";
  const icons: AlertIconKey[] = ["brain", "alert", "target", "zap", "trend", "lightbulb", "gauge"];
  return {
    theme,
    accentColor: typeof o.accentColor === "string" ? o.accentColor : undefined,
    iconBgColor: typeof o.iconBgColor === "string" ? o.iconBgColor : undefined,
    cardBgColor: typeof o.cardBgColor === "string" ? o.cardBgColor : undefined,
    icon: icons.includes(o.icon as AlertIconKey) ? (o.icon as AlertIconKey) : "alert",
    layout: (["horizontal", "vertical", "auto"] as AlertLayout[]).includes(o.layout as AlertLayout)
      ? (o.layout as AlertLayout)
      : "auto"
  };
}

export type AlertDisplaySize = "minimal" | "compact" | "full";

function isDarkHexColor(color: string): boolean {
  const hex = color.replace("#", "");
  if (hex.length < 6) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.45;
}

export function resolveAlertDisplaySize(widgetWidth?: number, widgetHeight?: number): AlertDisplaySize {
  const w = widgetWidth ?? 6;
  const h = widgetHeight ?? 3;
  if (w <= 3 || h <= 2) return "minimal";
  if (w <= 5 || h <= 3) return "compact";
  return "full";
}

export function resolveAlertLayout(
  visual: AlertVisualConfig,
  widgetWidth?: number,
  widgetHeight?: number
): "horizontal" | "vertical" {
  const size = resolveAlertDisplaySize(widgetWidth, widgetHeight);
  if (size === "minimal" || size === "compact") return "vertical";
  if (visual.layout === "horizontal" || visual.layout === "vertical") return visual.layout;
  return (widgetWidth ?? 6) >= 8 ? "horizontal" : "vertical";
}

export function resolveAlertThemeTokens(visual: AlertVisualConfig) {
  const resolvedTheme =
    visual.theme === "auto" ? "clean" : visual.theme;
  const presetKey =
    resolvedTheme === "custom" ? "clean" : (resolvedTheme as Exclude<AlertTheme, "custom" | "auto">);
  const base = ALERT_THEME_PRESETS[presetKey] ?? ALERT_THEME_PRESETS.clean;
  const cardBg = visual.cardBgColor ?? base.cardBg;
  const isDark =
    visual.theme === "premium" ||
    (visual.theme === "custom" && isDarkHexColor(cardBg));
  const darkText = ALERT_THEME_PRESETS.premium;
  return {
    accent: visual.accentColor ?? (visual.theme === "premium" ? ALERT_THEME_PRESETS.premium.accent : base.accent),
    iconBg: visual.iconBgColor ?? (visual.theme === "premium" ? ALERT_THEME_PRESETS.premium.iconBg : base.iconBg),
    cardBg: visual.theme === "premium" && !visual.cardBgColor ? ALERT_THEME_PRESETS.premium.cardBg : cardBg,
    text: isDark ? darkText.text : base.text,
    textDim: isDark ? darkText.textDim : base.textDim,
    border: isDark ? darkText.border : base.border,
    isDark
  };
}

export function defaultTemplateForSource(source: AlertSource): AlertTemplate {
  switch (source.kind) {
    case "learning":
      return "brain_insight";
    case "learning_phase":
      return "brain_progress";
    case "automation":
    case "goal":
    case "variation":
      return "metric_threshold";
    default:
      return "metric_threshold";
  }
}

export function usesAlertBuilder(type: string): boolean {
  return type === "alerts.card";
}
