"use client";

import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import ReactGridLayout, {
  noCompactor,
  useContainerWidth,
  verticalCompactor,
  type Layout
} from "react-grid-layout";
import { GridBackground } from "react-grid-layout/extras";
import "react-grid-layout/css/styles.css";

import { WidgetRenderer } from "@/components/dashboard/canvas/WidgetRenderer";
import { WidgetChrome } from "@/components/dashboard/canvas/WidgetChrome";
import { getWidgetDefinition } from "@/lib/dashboard/widget-catalog";
import type { WidgetInstanceDto } from "@/lib/dashboard/widget-catalog";
import { parseWidgetPeriod } from "@/lib/dashboard/widget-period";
import type { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";

type DashboardData = ReturnType<typeof useDashboardData>;

const GRID_COLS = 12;
const ROW_HEIGHT = 80;
const GRID_MARGIN: [number, number] = [12, 12];

export function DashboardGrid({
  widgets,
  editMode,
  allowResize,
  dashboardData,
  onLayoutChange,
  onRemove,
  onWidgetConfigChange,
  layoutKey = 0
}: {
  widgets: WidgetInstanceDto[];
  editMode: boolean;
  allowResize: boolean;
  dashboardData: DashboardData;
  onLayoutChange: (widgets: WidgetInstanceDto[]) => void;
  onRemove: (id: string) => void;
  onWidgetConfigChange?: (widgetId: string, config: Record<string, unknown>) => void;
  layoutKey?: number;
}) {
  const tPeriod = useTranslations("period");
  const { width, containerRef, mounted } = useContainerWidth({ initialWidth: 1280 });

  const layout: Layout = useMemo(
    () =>
      widgets.map((w) => {
        const def = getWidgetDefinition(w.widgetType);
        return {
          i: w.id,
          x: w.x,
          y: w.y,
          w: w.w,
          h: w.h,
          minW: def?.minW ?? 2,
          maxW: def?.maxW ?? GRID_COLS,
          minH: def?.minH ?? 1,
          static: !editMode || !allowResize
        };
      }),
    [widgets, editMode, allowResize]
  );

  const gridRows = useMemo(() => {
    if (!widgets.length) return 8;
    const bottom = widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0);
    return Math.max(bottom + 2, 8);
  }, [widgets]);

  const persistLayout = useCallback(
    (next: Layout) => {
      const merged = widgets.map((w) => {
        const cell = next.find((c) => c.i === w.id);
        if (!cell) return w;
        return { ...w, x: cell.x, y: cell.y, w: cell.w, h: cell.h };
      });
      onLayoutChange(merged);
    },
    [widgets, onLayoutChange]
  );

  return (
    <div
      ref={containerRef}
      className={editMode ? "dashboard-canvas-shell--edit relative w-full" : "relative w-full"}
    >
      {mounted ? (
        <>
          {editMode ? (
            <GridBackground
              className="dashboard-canvas-grid-bg"
              width={width}
              cols={GRID_COLS}
              rowHeight={ROW_HEIGHT}
              margin={GRID_MARGIN}
              containerPadding={[0, 0]}
              rows={gridRows}
              color="transparent"
              borderRadius={12}
            />
          ) : null}
          <ReactGridLayout
            key={layoutKey}
            className="dashboard-canvas-grid relative z-[1]"
            layout={layout}
            width={width}
            gridConfig={{
              cols: GRID_COLS,
              rowHeight: ROW_HEIGHT,
              margin: GRID_MARGIN,
              containerPadding: [0, 0] as const
            }}
            compactor={editMode ? verticalCompactor : noCompactor}
            dragConfig={{
              enabled: editMode,
              handle: ".widget-drag-handle",
              bounded: false,
              cancel: "button, a, input, textarea, .recharts-wrapper"
            }}
            resizeConfig={{ enabled: editMode && allowResize }}
            onDragStop={(next) => {
              if (editMode) persistLayout(next);
            }}
            onResizeStop={(next) => {
              if (editMode) persistLayout(next);
            }}
          >
            {widgets.filter((w) => w.visible).map((w) => {
              const isMetricCard =
                w.widgetType === "metrics.card" || w.widgetType.startsWith("metric.single.");
              const cardStyle = w.config.cardStyle as string | undefined;
              const compact =
                w.widgetType === "metrics.quickPills" ||
                (isMetricCard && cardStyle === "compact");
              const widgetPeriod = parseWidgetPeriod(w.config);
              const periodBadge = widgetPeriod
                ? tPeriod(widgetPeriod as "last7")
                : undefined;
              return (
              <div
                key={w.id}
                className="flex h-full w-full min-h-0 flex-col overflow-hidden rounded-xl border"
                style={{ borderColor: "var(--border-color)", background: "var(--surface-card)" }}
              >
                <WidgetChrome
                  title={w.title}
                  editMode={editMode}
                  compact={compact}
                  periodBadge={periodBadge}
                  onRemove={() => onRemove(w.id)}
                >
                  <WidgetRenderer
                    instance={w}
                    dashboardData={dashboardData}
                    onWidgetConfigChange={onWidgetConfigChange}
                  />
                </WidgetChrome>
              </div>
            );
            })}
          </ReactGridLayout>
        </>
      ) : null}
    </div>
  );
}
