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
import {
  BREAKDOWN_GRID_COLS,
  BREAKDOWN_GRID_ROW_HEIGHT,
  fitBreakdownLayoutToContent
} from "@/lib/report-breakdown-layout";
import type { ReportBreakdownSection, ReportBreakdownType } from "@/lib/report-breakdown-data";
import { cn } from "@/lib/cn";

const GRID_MARGIN: [number, number] = [12, 12];

function ReportBreakdownPrintGrid({
  layout,
  sections,
  renderCard
}: {
  layout: ReportBreakdownLayoutItem[];
  sections: ReportBreakdownSection[];
  renderCard: (type: ReportBreakdownType) => ReactNode;
}) {
  const fittedLayout = useMemo(
    () =>
      fitBreakdownLayoutToContent(
        sections.map((s) => ({ type: s.type, rows: s.rows })),
        layout
      ),
    [layout, sections]
  );

  const gridRows = useMemo(
    () => fittedLayout.reduce((max, item) => Math.max(max, item.y + item.h), 0),
    [fittedLayout]
  );

  return (
    <div
      className="report-breakdown-print-grid overflow-visible"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${BREAKDOWN_GRID_COLS}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${gridRows}, ${BREAKDOWN_GRID_ROW_HEIGHT}px)`,
        gap: `${GRID_MARGIN[1]}px`,
        width: "100%"
      }}
    >
      {fittedLayout.map((item) => (
        <div
          key={item.id}
          className="report-breakdown-print-cell overflow-visible"
          style={{
            gridColumn: `${item.x + 1} / span ${item.w}`,
            gridRow: `${item.y + 1} / span ${item.h}`
          }}
        >
          {renderCard(item.id)}
        </div>
      ))}
    </div>
  );
}

export function ReportBreakdownGrid({
  layout,
  sections,
  editMode,
  isPrint,
  onLayoutChange,
  renderCard
}: {
  layout: ReportBreakdownLayoutItem[];
  sections: ReportBreakdownSection[];
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
        maxW: BREAKDOWN_GRID_COLS,
        static: !editMode
      })),
    [layout, editMode]
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

  if (isPrint) {
    return (
      <ReportBreakdownPrintGrid layout={layout} sections={sections} renderCard={renderCard} />
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "report-breakdown-grid relative w-full overflow-visible",
        editMode && "report-breakdown-grid--edit rounded-xl border border-dashed border-[var(--ui-accent-border)] p-2"
      )}
    >
      {mounted ? (
        <ReactGridLayout
          className="report-breakdown-grid-inner overflow-visible"
          layout={gridLayout}
          width={width}
          gridConfig={{
            cols: BREAKDOWN_GRID_COLS,
            rowHeight: BREAKDOWN_GRID_ROW_HEIGHT,
            margin: GRID_MARGIN,
            containerPadding: [0, 0] as const
          }}
          compactor={editMode ? verticalCompactor : noCompactor}
          dragConfig={{
            enabled: editMode,
            handle: ".report-breakdown-drag-handle",
            cancel: ".recharts-wrapper, table, button, a, input"
          }}
          resizeConfig={{ enabled: editMode }}
          onDragStop={persistLayout}
          onResizeStop={persistLayout}
          style={{ minHeight: gridRows * BREAKDOWN_GRID_ROW_HEIGHT + GRID_MARGIN[1] * (gridRows - 1) }}
        >
          {layout.map((item) => (
            <div
              key={item.id}
              className={cn(
                "report-breakdown-grid-item overflow-visible",
                editMode && "ring-1 ring-[var(--ui-accent-border)]"
              )}
            >
              {editMode ? (
                <div className="report-breakdown-drag-handle flex h-6 cursor-grab items-center justify-center rounded-t-lg border-b border-[var(--creator-card-border,var(--border-color))] bg-[var(--creator-card-bg-inset,var(--surface-bg))] text-[10px] font-medium text-[var(--text-dim)] active:cursor-grabbing">
                  ⠿
                </div>
              ) : null}
              {renderCard(item.id)}
            </div>
          ))}
        </ReactGridLayout>
      ) : (
        <ReportBreakdownPrintGrid layout={layout} sections={sections} renderCard={renderCard} />
      )}
    </div>
  );
}
