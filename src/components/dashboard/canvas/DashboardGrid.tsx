"use client";

import { useMemo } from "react";
import ReactGridLayout, { useContainerWidth, verticalCompactor, type Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";

import { WidgetRenderer } from "@/components/dashboard/canvas/WidgetRenderer";
import { WidgetChrome } from "@/components/dashboard/canvas/WidgetChrome";
import type { WidgetInstanceDto } from "@/lib/dashboard/widget-catalog";
import type { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";

type DashboardData = ReturnType<typeof useDashboardData>;

export function DashboardGrid({
  widgets,
  editMode,
  allowResize,
  dashboardData,
  onLayoutChange,
  onRemove
}: {
  widgets: WidgetInstanceDto[];
  editMode: boolean;
  allowResize: boolean;
  dashboardData: DashboardData;
  onLayoutChange: (widgets: WidgetInstanceDto[]) => void;
  onRemove: (id: string) => void;
}) {
  const { width, containerRef, mounted } = useContainerWidth({ initialWidth: 1280 });

  const layout: Layout = useMemo(
    () =>
      widgets.map((w) => ({
        i: w.id,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
        minW: 2,
        maxW: 12,
        minH: 1,
        static: !editMode || !allowResize
      })),
    [widgets, editMode, allowResize]
  );

  return (
    <div ref={containerRef} className="w-full">
      {mounted ? (
        <ReactGridLayout
          layout={layout}
          width={width}
          gridConfig={{ cols: 12, rowHeight: 80, margin: [12, 12] as const, containerPadding: [0, 0] as const }}
          compactor={verticalCompactor}
          dragConfig={{ enabled: editMode, handle: ".widget-drag-handle" }}
          resizeConfig={{ enabled: editMode && allowResize }}
          onLayoutChange={(next) => {
            if (!editMode) return;
            const merged = widgets.map((w) => {
              const cell = next.find((c) => c.i === w.id);
              if (!cell) return w;
              return { ...w, x: cell.x, y: cell.y, w: cell.w, h: cell.h };
            });
            onLayoutChange(merged);
          }}
        >
          {widgets.filter((w) => w.visible).map((w) => (
            <div key={w.id} className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--border-color)", background: "var(--surface-card)" }}>
              <WidgetChrome
                title={w.title}
                editMode={editMode}
                onRemove={() => onRemove(w.id)}
              >
                <WidgetRenderer instance={w} dashboardData={dashboardData} />
              </WidgetChrome>
            </div>
          ))}
        </ReactGridLayout>
      ) : null}
    </div>
  );
}
