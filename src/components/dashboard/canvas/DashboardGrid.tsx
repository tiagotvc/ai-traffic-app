"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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
import { WidgetFitShell } from "@/components/dashboard/canvas/WidgetFitShell";
import { isAppBlockType } from "@/lib/dashboard/app-block-config";
import { getWidgetDefinition, type WidgetInstanceDto } from "@/lib/dashboard/widget-catalog";
import { stackWidgetsForMobile } from "@/lib/dashboard/mobile-grid-layout";
import {
  DASHBOARD_GRID_MARGIN,
  DASHBOARD_GRID_ROW_HEIGHT,
  HIGHLIGHTS_EDIT_GRID_COLS,
  HIGHLIGHTS_EDIT_SCALE,
  computeSquareGridRowHeight,
  contentGridRows
} from "@/lib/dashboard/widget-grid-fit";
import { normalizeWidgetLayout } from "@/lib/dashboard/widget-layout-normalize";
import { highlightsWidgetUsesPanel } from "@/lib/dashboard/highlights-canvas-shell";
import {
  HERO_CARD_ROWS,
  HIGHLIGHTS_HERO_GROUP,
  HIGHLIGHTS_SECONDARY_GROUP,
  SECONDARY_CARD_W,
  isHighlightFitWidget,
  scaleHighlightsLayoutForSquareEdit,
  scaleHighlightsLayoutFromSquareEdit
} from "@/lib/dashboard/highlights-layout-widgets";
import { cn } from "@/lib/cn";
import { parseWidgetPeriod } from "@/lib/dashboard/widget-period";
import { useIsMobile } from "@/uxpilot-ui/hooks/use-mobile";
import type { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";

type DashboardData = ReturnType<typeof useDashboardData>;

const GRID_COLS = 12;
const GRID_MARGIN = DASHBOARD_GRID_MARGIN;
const EDIT_CANVAS_BUFFER_ROWS = 36;
const HIGHLIGHTS_EDIT_BUFFER_ROWS = 8;
const EDIT_CANVAS_MIN_ROWS = 8;

export function DashboardGrid({
  widgets,
  editMode,
  allowResize,
  dashboardData,
  onLayoutChange,
  onRemove,
  onWidgetConfigChange,
  onConfigureWidget,
  selectedWidgetId,
  onSelectWidget,
  layoutKey = 0,
  highlightsShell = false,
  highlightsInlineEdit = false,
  allowRemove = true
}: {
  widgets: WidgetInstanceDto[];
  editMode: boolean;
  allowResize: boolean;
  dashboardData: DashboardData;
  onLayoutChange: (widgets: WidgetInstanceDto[]) => void;
  onRemove: (id: string) => void;
  onWidgetConfigChange?: (widgetId: string, config: Record<string, unknown>) => void;
  onConfigureWidget?: (widget: WidgetInstanceDto) => void;
  selectedWidgetId?: string | null;
  onSelectWidget?: (widgetId: string) => void;
  layoutKey?: number;
  highlightsShell?: boolean;
  highlightsInlineEdit?: boolean;
  allowRemove?: boolean;
}) {
  const tPeriod = useTranslations("period");
  const { width, containerRef, mounted } = useContainerWidth({ initialWidth: 1280 });
  const isMobile = useIsMobile();
  const useMobileStack = isMobile && !editMode;
  const isHighlightsContext = highlightsShell || highlightsInlineEdit;
  const highlightsCanLayout = highlightsInlineEdit;
  const gridCols = highlightsInlineEdit ? HIGHLIGHTS_EDIT_GRID_COLS : GRID_COLS;
  const rowHeight = useMemo(() => {
    if (highlightsInlineEdit && width > 0) {
      return computeSquareGridRowHeight(width, HIGHLIGHTS_EDIT_GRID_COLS, GRID_MARGIN);
    }
    return DASHBOARD_GRID_ROW_HEIGHT;
  }, [highlightsInlineEdit, width]);

  const gridWidgets = useMemo(() => {
    if (highlightsInlineEdit) {
      return scaleHighlightsLayoutForSquareEdit(widgets);
    }
    return widgets;
  }, [widgets, highlightsInlineEdit]);

  const shouldFitContent = useCallback(
    (w: WidgetInstanceDto) => {
      if (useMobileStack || editMode || highlightsShell) return false;
      return isHighlightFitWidget(w);
    },
    [editMode, useMobileStack, highlightsShell]
  );

  const [contentFitRows, setContentFitRows] = useState<Record<string, number>>({});

  const handleContentFitMeasure = useCallback(
    (widgetId: string, heightPx: number) => {
      const rows = contentGridRows(heightPx, 1, 4, rowHeight);
      setContentFitRows((prev) => (prev[widgetId] === rows ? prev : { ...prev, [widgetId]: rows }));
    },
    [rowHeight]
  );

  const layoutWidgets = useMemo(() => {
    const withHeights = gridWidgets.map((w) => {
      if (shouldFitContent(w) && contentFitRows[w.id] != null) {
        return { ...w, h: contentFitRows[w.id]! };
      }
      return w;
    });
    if (highlightsShell && !editMode) {
      return withHeights;
    }
    return normalizeWidgetLayout(withHeights);
  }, [gridWidgets, contentFitRows, shouldFitContent, highlightsShell, editMode]);

  const desktopLayout: Layout = useMemo(
    () =>
      layoutWidgets.map((w) => {
        const def = getWidgetDefinition(w.widgetType);
        const isSecondaryHighlight =
          w.widgetType === "metrics.card" &&
          w.config.highlightsGroup === HIGHLIGHTS_SECONDARY_GROUP;
        const isHeroHighlight =
          w.widgetType === "metrics.card" && w.config.highlightsGroup === HIGHLIGHTS_HERO_GROUP;
        const isBrainBanner = w.widgetType === "brain.learnings";
        const editScale = highlightsInlineEdit ? HIGHLIGHTS_EDIT_SCALE : 1;
        const secondaryMinW = SECONDARY_CARD_W * editScale;
        const secondaryMaxW = GRID_COLS * editScale;
        const fixedOneRow = isSecondaryHighlight || (isBrainBanner && isHighlightsContext);
        return {
          i: w.id,
          x: w.x,
          y: w.y,
          w: w.w,
          h: w.h,
          minW: isSecondaryHighlight ? secondaryMinW : (def?.minW ?? 2) * editScale,
          maxW: isSecondaryHighlight ? secondaryMaxW : gridCols,
          minH: fixedOneRow ? 1 : isHeroHighlight ? HERO_CARD_ROWS : (def?.minH ?? 1),
          maxH: fixedOneRow ? 1 : undefined,
          static: !editMode
        };
      }),
    [layoutWidgets, editMode, highlightsInlineEdit, gridCols, isHighlightsContext]
  );

  const layout: Layout = useMemo(
    () => (useMobileStack ? stackWidgetsForMobile(widgets) : desktopLayout),
    [useMobileStack, widgets, desktopLayout]
  );

  const gridRows = useMemo(() => {
    const bottom = layoutWidgets.length
      ? layout.reduce((max, cell) => Math.max(max, cell.y + cell.h), 0)
      : 0;
    const contentRows = Math.max(bottom + 2, 8);
    if (editMode) {
      const buffer = highlightsInlineEdit ? HIGHLIGHTS_EDIT_BUFFER_ROWS : EDIT_CANVAS_BUFFER_ROWS;
      return Math.max(contentRows + buffer, EDIT_CANVAS_MIN_ROWS);
    }
    return contentRows;
  }, [layoutWidgets.length, layout, editMode, highlightsInlineEdit]);

  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistLayout = useCallback(
    (next: Layout) => {
      let merged = gridWidgets.map((w) => {
        const cell = next.find((c) => c.i === w.id);
        if (!cell) return w;
        let h = cell.h;
        if (shouldFitContent(w) && contentFitRows[w.id] != null) {
          h = contentFitRows[w.id]!;
        }
        return { ...w, x: cell.x, y: cell.y, w: cell.w, h };
      });
      merged = normalizeWidgetLayout(merged);
      if (highlightsInlineEdit) {
        merged = scaleHighlightsLayoutFromSquareEdit(merged);
      }
      if (isHighlightsContext) {
        merged = merged.map((w) => {
          if (w.widgetType === "brain.learnings" && w.h !== 1) {
            return { ...w, h: 1 };
          }
          if (
            w.widgetType === "metrics.card" &&
            w.config.highlightsGroup === HIGHLIGHTS_SECONDARY_GROUP &&
            w.h !== 1
          ) {
            return { ...w, h: 1 };
          }
          return w;
        });
        merged = normalizeWidgetLayout(merged);
      }

      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistTimerRef.current = setTimeout(() => {
        onLayoutChange(merged);
      }, 300);
    },
    [gridWidgets, onLayoutChange, shouldFitContent, contentFitRows, highlightsInlineEdit, isHighlightsContext]
  );

  const renderWidget = (w: WidgetInstanceDto) => {
    const def = getWidgetDefinition(w.widgetType);
    const embedded = def?.embeddedChrome ?? false;
    const isMetricCard =
      w.widgetType === "metrics.card" || w.widgetType.startsWith("metric.single.");
    const cardStyle = w.config.cardStyle as string | undefined;
    const isQuickPills = w.widgetType === "metrics.quickPills";
    const compact =
      isQuickPills ||
      (isMetricCard && cardStyle === "compact");
    const isSecondaryHighlight =
      w.widgetType === "metrics.card" &&
      w.config.highlightsGroup === HIGHLIGHTS_SECONDARY_GROUP;
    const isBrainBanner = w.widgetType === "brain.learnings";
    const widgetFitsContent = shouldFitContent(w);
    const overlayEditChrome =
      highlightsInlineEdit &&
      (isHighlightFitWidget(w) || isSecondaryHighlight || isBrainBanner);
    const usesHighlightsPanel =
      !editMode && isHighlightsContext && highlightsWidgetUsesPanel(w.widgetType);
    const isPanelWidget = highlightsWidgetUsesPanel(w.widgetType);
    const showShell =
      (editMode && !embedded && !overlayEditChrome) || usesHighlightsPanel;
    const widgetPeriod =
      w.widgetType === "app.filters" || w.widgetType === "app.table"
        ? null
        : parseWidgetPeriod(w.config);
    const periodBadge = widgetPeriod ? tPeriod(widgetPeriod as "last7") : undefined;

    const chrome = (
      <WidgetChrome
        title={w.title}
        editMode={editMode}
        compact={compact}
        embedded={embedded}
        periodBadge={periodBadge}
        fitContent={widgetFitsContent}
        bare={overlayEditChrome || !showShell || usesHighlightsPanel}
        fillHeight={
          (highlightsInlineEdit && (isSecondaryHighlight || isBrainBanner)) ||
          (!widgetFitsContent && (isPanelWidget || embedded) && !overlayEditChrome)
        }
        overlayEditChrome={overlayEditChrome}
        selected={selectedWidgetId === w.id}
        onSelect={editMode && onSelectWidget ? () => onSelectWidget(w.id) : undefined}
        onRemove={() => onRemove(w.id)}
        allowRemove={allowRemove}
        onConfigure={
          editMode && isAppBlockType(w.widgetType) && onConfigureWidget
            ? () => onConfigureWidget(w)
            : undefined
        }
      >
        <WidgetRenderer
          instance={w}
          dashboardData={dashboardData}
          onWidgetConfigChange={onWidgetConfigChange}
        />
      </WidgetChrome>
    );

    const shellClassName = cn(
      "dashboard-widget-shell flex w-full flex-col",
      editMode || isPanelWidget ? "h-full min-h-0" : showShell && "min-h-0",
      highlightsShell &&
        !editMode &&
        (isSecondaryHighlight || isBrainBanner) &&
        "dashboard-widget-shell--grid-cell h-full min-h-0",
      showShell &&
        (usesHighlightsPanel
          ? "dashboard-panel rounded-2xl p-4 sm:p-5"
          : "rounded-xl"),
      selectedWidgetId === w.id &&
        editMode &&
        "ring-2 ring-[rgba(124,58,237,0.45)] ring-offset-1 ring-offset-[var(--surface-bg)]",
      widgetFitsContent
        ? "dashboard-widget--fit-content h-auto overflow-visible"
        : editMode || isPanelWidget
          ? "h-full overflow-hidden"
          : showShell
            ? compact
              ? "overflow-visible"
              : usesHighlightsPanel
                ? "h-auto overflow-visible"
                : "h-full overflow-hidden"
            : "h-full overflow-visible"
    );

    const shellStyle =
      showShell && !usesHighlightsPanel
        ? {
            borderTopWidth: 1,
            borderRightWidth: 1,
            borderBottomWidth: 1,
            borderLeftWidth: 1,
            borderStyle: "solid" as const,
            borderColor: "var(--border-color)",
            background: "var(--surface-card)"
          }
        : undefined;

    const shellBody = (
      <div className={shellClassName} style={shellStyle}>
        {chrome}
      </div>
    );

    if (widgetFitsContent) {
      return (
        <WidgetFitShell
          key={w.id}
          enabled
          onMeasure={(heightPx) => handleContentFitMeasure(w.id, heightPx)}
          className="h-auto w-full"
        >
          {shellBody}
        </WidgetFitShell>
      );
    }

    return (
      <div key={w.id} className={shellClassName} style={shellStyle}>
        {chrome}
      </div>
    );
  };

  if (useMobileStack) {
    return (
      <div
        ref={containerRef}
        className="dashboard-canvas-shell--mobile-stack flex w-full flex-col gap-3"
      >
        {widgets.filter((w) => w.visible).map((w) => renderWidget(w))}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        editMode ? "dashboard-canvas-shell--edit relative w-full" : "relative w-full",
        useMobileStack && "dashboard-canvas-shell--mobile-stack",
        isHighlightsContext && "dashboard-canvas-shell--highlights"
      )}
    >
      {mounted ? (
        <>
          {editMode ? (
            <GridBackground
              className="dashboard-canvas-grid-bg"
              width={width}
              cols={gridCols}
              rowHeight={rowHeight}
              margin={GRID_MARGIN}
              containerPadding={[0, 0]}
              rows={gridRows}
              color="transparent"
              borderRadius={12}
            />
          ) : null}
          <ReactGridLayout
            key={layoutKey}
            className={cn(
              "dashboard-canvas-grid relative z-[1]",
              editMode && "dashboard-canvas-grid--edit"
            )}
            layout={layout}
            width={width}
            gridConfig={{
              cols: gridCols,
              rowHeight,
              margin: GRID_MARGIN,
              containerPadding: [0, 0] as const
            }}
            compactor={editMode ? verticalCompactor : noCompactor}
            dragConfig={{
              enabled: editMode,
              ...(highlightsInlineEdit ? {} : { handle: ".widget-drag-handle" }),
              bounded: false,
              cancel: "button, a, input, textarea, .widget-edit-bar button"
            }}
            resizeConfig={{
              enabled: editMode && (allowResize || highlightsCanLayout),
              handles: ["se", "e", "s"]
            }}
            onDragStop={(next) => {
              if (editMode) persistLayout(next);
            }}
            onResizeStop={(next) => {
              if (editMode) persistLayout(next);
            }}
          >
            {layoutWidgets.filter((w) => w.visible).map((w) => renderWidget(w))}
          </ReactGridLayout>
        </>
      ) : null}
    </div>
  );
}
