"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import ReactGridLayout, {
  noCompactor,
  useContainerWidth,
  verticalCompactor,
  type Layout
} from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import type { ReportBreakdownLayoutItem } from "@/lib/report-breakdown-layout";
import type { ReportBreakdownType } from "@/lib/report-breakdown-data";
import { cn } from "@/lib/cn";

const GRID_COLS = 12;
const ROW_HEIGHT = 52;
const GRID_MARGIN: [number, number] = [12, 12];

export function ReportBreakdownGrid({
  layout,
  editMode,
  isPrint,
  onLayoutChange,
  renderCard
}: {
  layout: ReportBreakdownLayoutItem[];
  editMode: boolean;
  isPrint: boolean;
  onLayoutChange: (next: ReportBreakdownLayoutItem[]) => void;
  renderCard: (type: ReportBreakdownType) => ReactNode;
}) {
  const { width, containerRef, mounted } = useContainerWidth({ initialWidth: 960 });

  const gridLayout: Layout = useMemo(
    () =>
      layout.map((item) => ({
        i: item.id,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        minW: 3,
        minH: 3,
        maxW: GRID_COLS,
        static: isPrint || !editMode
      })),
    [layout, editMode, isPrint]
  );

  const gridRows = useMemo(() => {
    const bottom = gridLayout.reduce((max, cell) => Math.max(max, cell.y + cell.h), 0);
    return Math.max(bottom + 1, 6);
  }, [gridLayout]);

  const persistLayout = useCallback(
    (next: Layout) => {
      const merged = layout.map((item) => {
        const cell = next.find((c) => c.i === item.id);
        if (!cell) return item;
        return { ...item, x: cell.x, y: cell.y, w: cell.w, h: cell.h };
      });
      onLayoutChange(merged);
    },
    [layout, onLayoutChange]
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "report-breakdown-grid relative w-full",
        editMode && "report-breakdown-grid--edit rounded-xl border border-dashed border-[rgba(245,166,35,0.45)] p-2"
      )}
    >
      {mounted ? (
        <ReactGridLayout
          className="report-breakdown-grid-inner"
          layout={gridLayout}
          width={width}
          gridConfig={{
            cols: GRID_COLS,
            rowHeight: ROW_HEIGHT,
            margin: GRID_MARGIN,
            containerPadding: [0, 0] as const
          }}
          compactor={editMode ? verticalCompactor : noCompactor}
          dragConfig={{
            enabled: editMode && !isPrint,
            handle: ".report-breakdown-drag-handle",
            cancel: ".recharts-wrapper, table, button, a, input"
          }}
          resizeConfig={{ enabled: editMode && !isPrint }}
          onDragStop={persistLayout}
          onResizeStop={persistLayout}
          style={{ minHeight: gridRows * ROW_HEIGHT + GRID_MARGIN[1] * (gridRows - 1) }}
        >
          {layout.map((item) => (
            <div
              key={item.id}
              className={cn(
                "report-breakdown-grid-item flex h-full min-h-0 flex-col",
                editMode && "ring-1 ring-[rgba(245,166,35,0.35)]"
              )}
            >
              {editMode ? (
                <div className="report-breakdown-drag-handle flex h-6 shrink-0 cursor-grab items-center justify-center rounded-t-lg border-b border-[var(--border-color)] bg-[var(--surface-bg)] text-[10px] font-medium text-[var(--text-dim)] active:cursor-grabbing">
                  ⠿
                </div>
              ) : null}
              <div className="min-h-0 flex-1">{renderCard(item.id)}</div>
            </div>
          ))}
        </ReactGridLayout>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {layout.map((item) => (
            <div key={item.id}>{renderCard(item.id)}</div>
          ))}
        </div>
      )}
    </div>
  );
}
