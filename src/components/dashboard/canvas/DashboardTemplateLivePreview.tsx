"use client";

import { useMemo, type CSSProperties } from "react";

import { WidgetRenderer } from "@/components/dashboard/canvas/WidgetRenderer";
import { getWidgetDefinition } from "@/lib/dashboard/widget-catalog";
import { templateToPreviewInstances, widgetThumbColor } from "@/lib/dashboard/dashboard-template-thumb";
import {
  measureTemplatePreviewLayout,
  TEMPLATE_PREVIEW_GRID
} from "@/lib/dashboard/template-preview-position";
import type { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";

type DashboardData = ReturnType<typeof useDashboardData>;

export type DashboardTemplatePreviewSource = {
  name: string;
  widgets?: unknown;
};

function widgetPreviewShell(widgetType: string, compact: boolean) {
  const accent = widgetThumbColor(widgetType);
  const def = getWidgetDefinition(widgetType);
  const isChart =
    def?.category === "charts" || widgetType.startsWith("chart.") || widgetType === "premium.multiChart";
  const isAi = def?.category === "ai" || widgetType.startsWith("ai.");

  if (compact) {
    return {
      borderColor: `${accent}44`,
      background: `color-mix(in srgb, ${accent} 8%, var(--surface-card))`,
      boxShadow: "none"
    };
  }

  return {
    borderColor: `color-mix(in srgb, ${accent} 35%, var(--border-color))`,
    background: isChart
      ? `linear-gradient(160deg, color-mix(in srgb, ${accent} 7%, var(--surface-card)), var(--surface-bg))`
      : isAi
        ? `linear-gradient(160deg, color-mix(in srgb, ${accent} 9%, var(--surface-card)), var(--surface-bg))`
        : "var(--surface-card)",
    boxShadow: `0 4px 14px rgba(0,0,0,0.05), inset 0 1px 0 color-mix(in srgb, ${accent} 18%, transparent)`,
    borderLeftWidth: 3,
    borderLeftColor: accent
  } as CSSProperties;
}

const COMPACT_LIST_MAX_ROWS = 8;

export function DashboardTemplateLivePreview({
  tpl,
  dashboardData,
  viewportHeight = 280,
  viewportWidth = 500,
  compact = false
}: {
  tpl: DashboardTemplatePreviewSource;
  dashboardData: DashboardData;
  viewportHeight?: number;
  viewportWidth?: number;
  compact?: boolean;
}) {
  const instances = useMemo(() => templateToPreviewInstances(tpl), [tpl]);

  const fullRows = Math.max(...instances.map((w) => w.y + w.h), 1);
  const visibleRows = compact ? Math.min(fullRows, COMPACT_LIST_MAX_ROWS) : fullRows;
  const visibleInstances = compact
    ? instances.filter((w) => w.y < COMPACT_LIST_MAX_ROWS)
    : instances;

  const { gridHeight, scale, scaledHeight, paddingTop } = useMemo(
    () => measureTemplatePreviewLayout(visibleRows, viewportWidth, viewportHeight, compact),
    [visibleRows, viewportWidth, viewportHeight, compact]
  );

  if (!visibleInstances.length) {
    return <div className="skeleton-shimmer h-full min-h-[120px] rounded-lg" />;
  }

  const scaledWidth = TEMPLATE_PREVIEW_GRID.innerWidth * scale;

  return (
    <div
      className="relative overflow-hidden"
      style={{
        height: viewportHeight,
        width: "100%",
        background: compact
          ? "var(--surface-bg)"
          : "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.07), transparent 58%)"
      }}
    >
      <div
        className="absolute left-1/2"
        style={{
          top: paddingTop + Math.max(0, (viewportHeight - scaledHeight) / 2),
          width: scaledWidth,
          height: gridHeight * scale,
          transform: "translateX(-50%)",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            width: TEMPLATE_PREVIEW_GRID.innerWidth,
            height: gridHeight,
            transform: `scale(${scale})`,
            transformOrigin: "top left"
          }}
        >
          <div
            className="grid w-full content-start"
            style={{
              gridTemplateColumns: "repeat(12, 1fr)",
              gridTemplateRows: `repeat(${visibleRows}, ${TEMPLATE_PREVIEW_GRID.rowHeight}px)`,
              gap: TEMPLATE_PREVIEW_GRID.gap,
              height: gridHeight
            }}
          >
            {visibleInstances.map((w) => {
              const shell = widgetPreviewShell(w.widgetType, compact);
              return (
                <div
                  key={w.id}
                  className="min-h-0 overflow-hidden rounded-xl border"
                  style={{
                    gridColumn: `${w.x + 1} / span ${w.w}`,
                    gridRow: `${w.y + 1} / span ${Math.min(w.h, visibleRows - w.y)}`,
                    ...shell
                  }}
                >
                  <div className="max-h-full min-h-0 w-full overflow-hidden p-0.5">
                    <WidgetRenderer instance={w} dashboardData={dashboardData} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Altura ideal do corpo do popover para caber o layout inteiro. */
export function templatePreviewBodyHeight(
  tpl: DashboardTemplatePreviewSource,
  maxHeight: number,
  viewportWidth: number
): number {
  const instances = templateToPreviewInstances(tpl);
  const rows = Math.max(...instances.map((w) => w.y + w.h), 1);
  const measured = measureTemplatePreviewLayout(rows, viewportWidth, maxHeight, false);
  return Math.min(maxHeight, Math.ceil(measured.scaledHeight));
}
