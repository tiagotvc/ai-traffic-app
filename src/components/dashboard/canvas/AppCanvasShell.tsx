"use client";

import { useCallback, useMemo, useState } from "react";

import {
  BlockInsertModal,
  type PaletteBlockType
} from "@/components/dashboard/canvas/BlockInsertModal";
import { HighlightsCanvasViewProvider } from "@/components/dashboard/canvas/HighlightsCanvasViewContext";
import { AppCanvasScopeProvider } from "@/components/dashboard/canvas/AppCanvasScopeContext";
import { AppCanvasPlaceholder } from "@/components/dashboard/canvas/AppCanvasPlaceholder";
import { DashboardGrid } from "@/components/dashboard/canvas/DashboardGrid";
import { DashboardGridSkeleton } from "@/components/dashboard/canvas/DashboardGridSkeleton";
import { WidgetPalette } from "@/components/dashboard/canvas/WidgetPalette";
import { WidgetPropertyPanel } from "@/components/dashboard/canvas/WidgetPropertyPanel";
import { isAppBlockType } from "@/lib/dashboard/app-block-config";
import { HIGHLIGHTS_LAYOUT_EDITOR_V2 } from "@/lib/dashboard/highlights-layout-flags";
import type { LayoutDto } from "@/lib/dashboard/widget-catalog";
import type { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";

type DashboardData = ReturnType<typeof useDashboardData>;

export function AppCanvasShell({
  widgets,
  editMode,
  allowResize,
  dashboardData,
  layoutLoading,
  layoutRevision,
  onLayoutChange,
  onRemoveWidget,
  onAddWidget,
  onWidgetConfigChange,
  highlightsShell = false,
  highlightsMode = false
}: {
  widgets: LayoutDto["widgets"];
  editMode: boolean;
  allowResize: boolean;
  dashboardData: DashboardData;
  layoutLoading?: boolean;
  layoutRevision?: number;
  onLayoutChange: (widgets: LayoutDto["widgets"]) => void;
  onRemoveWidget: (id: string) => void;
  onAddWidget: (type: string, config?: Record<string, unknown>) => string | void;
  onWidgetConfigChange?: (widgetId: string, config: Record<string, unknown>) => void;
  highlightsShell?: boolean;
  /** Destaques — inline drag/resize only (not the Visões builder). */
  highlightsMode?: boolean;
}) {
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [pickerBlock, setPickerBlock] = useState<PaletteBlockType | null>(null);
  const highlightsInlineEdit = highlightsMode && editMode && HIGHLIGHTS_LAYOUT_EDITOR_V2;

  const selectedWidget = useMemo(
    () => widgets.find((w) => w.id === selectedWidgetId) ?? null,
    [widgets, selectedWidgetId]
  );

  const handleSelectWidget = useCallback((widgetId: string) => {
    setSelectedWidgetId(widgetId);
  }, []);

  const handleConfigureWidget = useCallback((widgetId: string) => {
    setSelectedWidgetId(widgetId);
  }, []);

  const handleRemove = useCallback(
    (id: string) => {
      if (selectedWidgetId === id) setSelectedWidgetId(null);
      onRemoveWidget(id);
    },
    [onRemoveWidget, selectedWidgetId]
  );

  const handlePatch = useCallback(
    (widgetId: string, patch: Record<string, unknown>) => {
      onWidgetConfigChange?.(widgetId, patch);
    },
    [onWidgetConfigChange]
  );

  const handleConfirmInsert = useCallback(
    (widgetType: string, config: Record<string, unknown>) => {
      const id = onAddWidget(widgetType, config);
      if (id) {
        setSelectedWidgetId(id);
      }
      setPickerBlock(null);
    },
    [onAddWidget]
  );

  const isEmpty = !widgets.length;

  const grid = (
    <DashboardGrid
      widgets={widgets}
      editMode={editMode}
      allowResize={allowResize}
      dashboardData={dashboardData}
      onLayoutChange={onLayoutChange}
      onRemove={handleRemove}
      onWidgetConfigChange={onWidgetConfigChange}
      layoutKey={layoutRevision}
      highlightsShell={highlightsShell && !editMode}
      highlightsInlineEdit={highlightsInlineEdit}
      allowRemove={!highlightsInlineEdit}
      selectedWidgetId={highlightsInlineEdit ? undefined : selectedWidgetId}
      onSelectWidget={highlightsInlineEdit ? undefined : handleSelectWidget}
      onConfigureWidget={
        highlightsInlineEdit
          ? undefined
          : (w) => {
              if (isAppBlockType(w.widgetType)) handleConfigureWidget(w.id);
            }
      }
    />
  );

  if (!editMode) {
    return (
      <HighlightsCanvasViewProvider active={highlightsShell}>
        <AppCanvasScopeProvider widgets={widgets}>
          {layoutLoading ? (
            <DashboardGridSkeleton />
          ) : isEmpty ? (
            <AppCanvasPlaceholder variant="canvas" hintOnly />
          ) : (
            grid
          )}
        </AppCanvasScopeProvider>
      </HighlightsCanvasViewProvider>
    );
  }

  if (highlightsInlineEdit) {
    return (
      <HighlightsCanvasViewProvider active={false}>
        <AppCanvasScopeProvider widgets={widgets}>
          {layoutLoading ? (
            <DashboardGridSkeleton variant="edit" />
          ) : isEmpty ? null : (
            <div className="builder-canvas-grid-area w-full py-2">{grid}</div>
          )}
        </AppCanvasScopeProvider>
      </HighlightsCanvasViewProvider>
    );
  }

  return (
    <HighlightsCanvasViewProvider active={false}>
      <AppCanvasScopeProvider widgets={widgets}>
        <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden">
          <WidgetPalette
            onPickBlock={setPickerBlock}
            onQuickAddWidget={(type) => {
              const id = onAddWidget(type);
              if (id) setSelectedWidgetId(id);
            }}
            className="h-full min-h-0 shrink-0 overflow-y-auto border-r"
          />
          <div
            className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-auto bg-[var(--surface-bg)]"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedWidgetId(null);
            }}
          >
            {layoutLoading ? (
              <div className="min-h-0 flex-1 p-3">
                <DashboardGridSkeleton variant="edit" />
              </div>
            ) : isEmpty ? (
              <AppCanvasPlaceholder
                variant="canvas"
                hintOnly
                className="m-0 min-h-full flex-1 rounded-none border-0"
              />
            ) : (
              <div className="builder-canvas-grid-area min-h-0 flex-1 p-2">{grid}</div>
            )}
          </div>
          <WidgetPropertyPanel
            widget={selectedWidget}
            onPatch={handlePatch}
            onClose={() => setSelectedWidgetId(null)}
            className="h-full min-h-0 shrink-0 overflow-y-auto border-l"
          />
        </div>
        <BlockInsertModal
          blockType={pickerBlock}
          dashboardData={dashboardData}
          onClose={() => setPickerBlock(null)}
          onConfirm={handleConfirmInsert}
        />
      </AppCanvasScopeProvider>
    </HighlightsCanvasViewProvider>
  );
}
