import type { WidgetInstanceDto } from "@/lib/dashboard/widget-catalog";

/** Vertical compact — removes empty rows after widget removal. */
export function compactWidgetLayout(widgets: WidgetInstanceDto[]): WidgetInstanceDto[] {
  if (!widgets.length) return widgets;
  const sorted = [...widgets].sort((a, b) => a.y - b.y || a.x - b.x);
  let cursorY = 0;
  return sorted.map((w, i) => {
    const next = { ...w, y: cursorY, sortOrder: i };
    cursorY += w.h;
    return next;
  });
}

export const GRID_BREAKPOINTS = { lg: 1200, md: 768, xs: 0 } as const;
export const GRID_COLS = { lg: 12, md: 6, xs: 1 } as const;
