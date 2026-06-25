import { getWidgetDefinition, type WidgetInstanceDto } from "@/lib/dashboard/widget-catalog";

function highlightsFixedRowHeight(w: WidgetInstanceDto): number | null {
  if (w.widgetType === "brain.learnings") return 1;
  if (w.widgetType === "metrics.card" && w.config.highlightsGroup === "secondaryKpi") {
    return 1;
  }
  return null;
}

function overlaps(a: WidgetInstanceDto, b: WidgetInstanceDto): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function resolveWidgetHeight(w: WidgetInstanceDto): number {
  const fixed = highlightsFixedRowHeight(w);
  if (fixed != null) return fixed;
  const minH = getWidgetDefinition(w.widgetType)?.minH ?? 1;
  return Math.max(w.h, minH);
}

/** Enforce catalog minH and resolve vertical collisions after height bumps. */
export function normalizeWidgetLayout(widgets: WidgetInstanceDto[]): WidgetInstanceDto[] {
  const withMinH = widgets.map((w) => {
    const h = resolveWidgetHeight(w);
    return w.h === h ? w : { ...w, h };
  });

  const sorted = [...withMinH].sort((a, b) => a.y - b.y || a.x - b.x);
  const placed: WidgetInstanceDto[] = [];

  for (const item of sorted) {
    let y = item.y;
    let changed = true;
    while (changed) {
      changed = false;
      for (const other of placed) {
        const candidate = { ...item, y };
        if (overlaps(candidate, other)) {
          y = other.y + other.h;
          changed = true;
        }
      }
    }
    placed.push({ ...item, y });
  }

  const unchanged =
    placed.length === widgets.length &&
    placed.every((w) => {
      const orig = widgets.find((o) => o.id === w.id);
      return orig && orig.h === w.h && orig.y === w.y;
    });

  return unchanged ? widgets : placed;
}

export function layoutNeedsNormalization(widgets: WidgetInstanceDto[]): boolean {
  const normalized = normalizeWidgetLayout(widgets);
  return normalized.some((w) => {
    const orig = widgets.find((o) => o.id === w.id);
    return !orig || orig.h !== w.h || orig.y !== w.y;
  });
}
