import { getWidgetDefinition, type WidgetInstanceDto, type WidgetSize } from "@/lib/dashboard/widget-catalog";
import { getSystemTemplateWidgetsByName } from "@/lib/dashboard/dashboard-system-templates";

export type DashboardTemplateWidget = {
  widgetType: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export function parseTemplateWidgets(raw: unknown): DashboardTemplateWidget[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const w = item as Record<string, unknown>;
      const widgetType = String(w.widgetType ?? "");
      if (!widgetType) return null;
      return {
        widgetType,
        x: Number(w.x ?? 0),
        y: Number(w.y ?? 0),
        w: Math.max(1, Number(w.w ?? 1)),
        h: Math.max(1, Number(w.h ?? 1))
      };
    })
    .filter((w): w is DashboardTemplateWidget => w !== null);
}

export function resolveTemplateWidgets(tpl: {
  name: string;
  widgets?: unknown;
}): DashboardTemplateWidget[] {
  const parsed = parseTemplateWidgets(tpl.widgets);
  if (parsed.length) return parsed;
  return parseTemplateWidgets(getSystemTemplateWidgetsByName(tpl.name));
}

export function templateToPreviewInstances(tpl: {
  name: string;
  widgets?: unknown;
}): WidgetInstanceDto[] {
  const raw =
    Array.isArray(tpl.widgets) && tpl.widgets.length > 0
      ? tpl.widgets
      : getSystemTemplateWidgetsByName(tpl.name);

  if (!Array.isArray(raw)) return [];

  const instances: WidgetInstanceDto[] = [];
  raw.forEach((item, i) => {
    if (!item || typeof item !== "object") return;
    const w = item as Record<string, unknown>;
    const widgetType = String(w.widgetType ?? "");
    if (!widgetType) return;
    const def = getWidgetDefinition(widgetType);
    instances.push({
      id: `tpl-preview-${i}`,
      layoutId: "preview",
      widgetType,
      title: null,
      x: Number(w.x ?? 0),
      y: Number(w.y ?? 0),
      w: Math.max(1, Number(w.w ?? 1)),
      h: Math.max(1, Number(w.h ?? 1)),
      size: String(w.size ?? def?.size ?? "md") as WidgetSize,
      visible: true,
      config: (w.config as Record<string, unknown>) ?? def?.defaultConfig ?? {},
      sortOrder: i
    });
  });
  return instances;
}

export function templateGridBounds(widgets: DashboardTemplateWidget[]): { cols: number; rows: number } {
  if (!widgets.length) return { cols: 12, rows: 4 };
  const rows = Math.max(...widgets.map((w) => w.y + w.h), 1);
  return { cols: 12, rows };
}

export function widgetThumbColor(widgetType: string): string {
  const def = getWidgetDefinition(widgetType);
  switch (def?.category) {
    case "metrics":
      return "rgba(16,185,129,0.55)";
    case "charts":
      return "rgba(99,102,241,0.55)";
    case "ai":
      return "rgba(168,85,247,0.5)";
    case "alerts":
      return "rgba(245,158,11,0.5)";
    case "clients":
      return "rgba(14,165,233,0.5)";
    case "layouts":
    case "premium":
      return "rgba(236,72,153,0.45)";
    case "advanced":
      return "rgba(234,88,12,0.5)";
    default:
      if (widgetType.startsWith("chart.")) return "rgba(99,102,241,0.55)";
      if (widgetType.startsWith("metrics.") || widgetType.startsWith("metric.")) {
        return "rgba(16,185,129,0.55)";
      }
      if (widgetType.startsWith("ai.")) return "rgba(168,85,247,0.5)";
      return "rgba(148,163,184,0.4)";
  }
}
